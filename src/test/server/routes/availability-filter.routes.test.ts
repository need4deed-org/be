import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  OccasionalType,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Key = "mondayMorning" | "fridayEvening" | "weekends";

const SLOTS: Record<Key, Partial<Timeslot>> = {
  mondayMorning: {
    rrule: "FREQ=WEEKLY;BYDAY=MO;",
    start: new Date(2026, 0, 5, 8, 0),
    end: new Date(2026, 0, 5, 11, 0),
  },
  fridayEvening: {
    rrule: "FREQ=WEEKLY;BYDAY=FR;WKST=MO",
    start: new Date(2026, 0, 9, 17, 0),
    end: new Date(2026, 0, 9, 20, 0),
  },
  weekends: { occasional: OccasionalType.WEEKENDS },
};

describe("filter[availability] on GET /volunteer and GET /opportunity", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let cookie: string;
  let coordinator: Person;
  let agent: Agent;
  const deals: Deal[] = [];
  const timeslots: Timeslot[] = [];
  const persons: Person[] = [];
  const volunteers = {} as Record<Key, Volunteer>;
  const opportunities = {} as Record<Key, Opportunity>;

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  async function dealWith(type: DealType, slot: Partial<Timeslot>) {
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type, postcodeId: postcode.id }),
    );
    deals.push(deal);
    const timeslot = await getRepository(dataSource, Timeslot).save(
      new Timeslot(slot),
    );
    timeslots.push(timeslot);
    await getRepository(dataSource, DealTimeslot).save(
      new DealTimeslot({ dealId: deal.id, timeslotId: timeslot.id }),
    );
    return deal;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Availability Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    for (const key of Object.keys(SLOTS) as Key[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: `Avail${key}`, lastName: `Slot${suffix}` }),
      );
      persons.push(person);
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: (await dealWith(DealType.VOLUNTEER, SLOTS[key])).id,
          personId: person.id,
        }),
      );
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Availability ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.SEARCHING,
          dealId: (await dealWith(DealType.OPPORTUNITY, SLOTS[key])).id,
          agentId: agent.id,
        }),
      );
    }

    coordinator = await fastify.db.personRepository.save(
      new Person({ firstName: "Availability", lastName: `Coord${suffix}` }),
    );
    const email = `availability-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinator.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const volunteer of Object.values(volunteers)) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const timeslot of timeslots) {
      await getRepository(dataSource, Timeslot).delete({ id: timeslot.id });
    }
    for (const person of [...persons, coordinator]) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  const cases: [string, string, Key[]][] = [
    ["a day", "filter[availability]=days~Monday", ["mondayMorning"]],
    ["a time", "filter[availability]=times~17-20", ["fridayEvening"]],
    [
      "a day and a time together",
      "filter[availability]=days~Monday&filter[availability]=times~17-20",
      [],
    ],
    ["occasional", "filter[availability]=occasional~weekends", ["weekends"]],
    [
      "a day covered by occasional",
      "filter[availability]=days~Saturday",
      ["weekends"],
    ],
    [
      "a day covered by occasional with a time",
      "filter[availability]=days~Saturday&filter[availability]=times~08-11",
      [],
    ],
    [
      "an empty value",
      "filter[availability]=",
      ["mondayMorning", "fridayEvening", "weekends"],
    ],
    ["an unknown value", "filter[availability]=days~Someday", []],
    ["the wrong separator", "filter[availability]=days|Monday", []],
  ];

  it.each(cases)("filters volunteers by %s", async (_, query, expected) => {
    const res = await get(
      `/volunteer?limit=50&filter[search]=Slot${suffix}&${query}`,
    );
    expect(res.statusCode).toBe(200);
    const ids = (res.json().data as { id: number }[]).map(({ id }) => id);
    expect(ids.sort()).toEqual(expected.map((k) => volunteers[k].id).sort());
  });

  it.each(cases)("filters opportunities by %s", async (_, query, expected) => {
    const res = await get(
      `/opportunity?limit=100&filter[search]=${suffix}&${query.replaceAll("filter[availability]=", "filter[availability][]=")}`,
    );
    expect(res.statusCode).toBe(200);
    const ids = (res.json().data as { id: number }[])
      .map(({ id }) => id)
      .filter((id) => Object.values(opportunities).some((o) => o.id === id));
    expect(ids.sort()).toEqual(expected.map((k) => opportunities[k].id).sort());
  });
});
