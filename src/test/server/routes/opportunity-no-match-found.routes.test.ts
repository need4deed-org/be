import { FastifyInstance } from "fastify";
import {
  addWorkingDays,
  berlinToday,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { berlinDayBoundaries } from "../../../services/jobs/berlin-dates";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";
const HOUR = 60 * 60 * 1000;

type Caller = "volunteer" | "coordinator";
type Key =
  | "accompanyingDue"
  | "accompanyingDueMatched"
  | "accompanyingLater"
  | "eventYesterday"
  | "eventToday"
  | "regular";

const at = (day: Date, hours: number) =>
  new Date(berlinDayBoundaries(day).startOfDay.getTime() + hours * HOUR);

describe("no match found (be#1162)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `NoMatch ${suffix}`;
  const today = berlinToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const setup: Record<Key, { type: OpportunityType; date?: Date }> = {
    accompanyingDue: {
      type: OpportunityType.ACCOMPANYING,
      date: at(addWorkingDays(today, 4), 10),
    },
    accompanyingDueMatched: {
      type: OpportunityType.ACCOMPANYING,
      date: at(addWorkingDays(today, 4), 10),
    },
    accompanyingLater: {
      type: OpportunityType.ACCOMPANYING,
      date: at(addWorkingDays(today, 5), 10),
    },
    eventYesterday: { type: OpportunityType.EVENTS, date: at(yesterday, 18) },
    eventToday: { type: OpportunityType.EVENTS, date: at(today, 1) },
    regular: { type: OpportunityType.REGULAR },
  };

  const opportunities = {} as Record<Key, Opportunity>;
  const deals: Deal[] = [];
  const onetimers: Onetimer[] = [];
  const persons: Person[] = [];
  let volunteer: Volunteer;
  const cookies = {} as Record<Caller, string>;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });
  const list = (as: Caller) =>
    get(
      `/opportunity?limit=100&filter[search]=${encodeURIComponent(prefix)}`,
      as,
    );
  const titlesOf = (data: { title: string }[]) =>
    data.map(({ title }) => title.slice(prefix.length + 1)).sort();

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    for (const [key, { type, date }] of Object.entries(setup) as [
      Key,
      (typeof setup)[Key],
    ][]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      const onetimer = date
        ? await fastify.db.onetimerRepository.save(new Onetimer({ date }))
        : undefined;
      if (onetimer) {
        onetimers.push(onetimer);
      }
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${prefix} ${key}`,
          type,
          status: OpportunityStatusType.SEARCHING,
          dealId: deal.id,
          onetimerId: onetimer?.id,
        }),
      );
    }

    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "NoMatch", lastName: `Matched${suffix}` }),
    );
    persons.push(volunteerPerson);
    const volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    deals.push(volunteerDeal);
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: volunteerPerson.id,
        dealId: volunteerDeal.id,
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
      }),
    );
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunities.accompanyingDueMatched.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      volunteer: UserRole.VOLUNTEER,
      coordinator: UserRole.COORDINATOR,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "NoMatch", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `no-match-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const onetimer of onetimers) {
      await fastify.db.onetimerRepository.delete({ id: onetimer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.close();
  });

  it("hides accompanying within 4 working days and past events from volunteers", async () => {
    const res = await list("volunteer");
    expect(res.statusCode).toBe(200);
    expect(titlesOf(res.json().data)).toEqual(
      ["accompanyingLater", "eventToday", "regular"].sort(),
    );
    expect(res.json().count).toBe(3);
  });

  it("shows everything to coordinators, flagging unmatched accompanying in the window", async () => {
    const res = await list("coordinator");
    expect(res.statusCode).toBe(200);
    const flags = Object.fromEntries(
      res
        .json()
        .data.map((row: { title: string; noMatchFound?: boolean }) => [
          row.title.slice(prefix.length + 1),
          row.noMatchFound,
        ]),
    );
    expect(flags).toEqual({
      accompanyingDue: true,
      accompanyingDueMatched: false,
      accompanyingLater: false,
      eventYesterday: false,
      eventToday: false,
      regular: false,
    });
  });

  it("carries the flag on the single opportunity", async () => {
    const due = await get(
      `/opportunity/${opportunities.accompanyingDue.id}`,
      "coordinator",
    );
    expect(due.statusCode).toBe(200);
    expect(due.json().data.noMatchFound).toBe(true);

    const matched = await get(
      `/opportunity/${opportunities.accompanyingDueMatched.id}`,
      "coordinator",
    );
    expect(matched.json().data.noMatchFound).toBe(false);
  });
});
