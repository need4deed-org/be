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
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
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

type Key =
  | "mondayMorning"
  | "fridayEvening"
  | "saturdayMorning"
  | "weekends"
  | "mondayOnetime";

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
  saturdayMorning: {
    rrule: "FREQ=WEEKLY;BYDAY=TU,SA;",
    start: new Date(2026, 0, 10, 8, 0),
    end: new Date(2026, 0, 10, 11, 0),
  },
  weekends: { occasional: OccasionalType.WEEKENDS },
  mondayOnetime: { start: new Date("2026-01-12T17:30:00+01:00") },
};

type OnetimerKey = "eventMoved" | "accompanying";

// appointment dates live in onetimer.date, not in deal timeslots
const ONETIMERS: Record<
  OnetimerKey,
  { type: OpportunityType; date: Date; slot?: Partial<Timeslot> }
> = {
  // moved from Monday to Tuesday 18:00; the Monday one-time timeslot is stale
  eventMoved: {
    type: OpportunityType.EVENTS,
    date: new Date("2026-01-13T18:00:00+01:00"),
    slot: { start: new Date("2026-01-12T18:00:00+01:00") },
  },
  accompanying: {
    type: OpportunityType.ACCOMPANYING,
    date: new Date("2026-01-14T09:00:00+01:00"),
  },
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
  const onetimerOpportunities = {} as Record<OnetimerKey, Opportunity>;
  const onetimers: Onetimer[] = [];
  const extraOpportunities: Opportunity[] = [];

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  async function dealWith(type: DealType, slot?: Partial<Timeslot>) {
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type, postcodeId: postcode.id }),
    );
    deals.push(deal);
    if (!slot) {
      return deal;
    }
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
          dealId: (await dealWith(DealType.VOLUNTEER, SLOTS[key])).id,
          agentId: agent.id,
        }),
      );
    }

    for (const [key, { type, date, slot }] of Object.entries(ONETIMERS)) {
      const onetimer = await getRepository(dataSource, Onetimer).save(
        new Onetimer({ date }),
      );
      onetimers.push(onetimer);
      onetimerOpportunities[key as OnetimerKey] =
        await fastify.db.opportunityRepository.save(
          new Opportunity({
            title: `Availability ${key} ${suffix}`,
            type,
            status: OpportunityStatusType.SEARCHING,
            dealId: (await dealWith(DealType.VOLUNTEER, slot)).id,
            onetimerId: onetimer.id,
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
    for (const opportunity of [
      ...Object.values(opportunities),
      ...Object.values(onetimerOpportunities),
      ...extraOpportunities,
    ]) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const volunteer of Object.values(volunteers)) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const onetimer of onetimers) {
      await getRepository(dataSource, Onetimer).delete({ id: onetimer.id });
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

  const ALL: Key[] = [
    "mondayMorning",
    "fridayEvening",
    "saturdayMorning",
    "weekends",
    "mondayOnetime",
  ];
  const cases: [string, string, Key[]][] = [
    ["a day", "availability=days~Monday", ["mondayMorning", "mondayOnetime"]],
    [
      "a day listed second in BYDAY",
      "availability=days~Saturday",
      ["saturdayMorning", "weekends"],
    ],
    [
      "a time",
      "availability=times~17-20",
      ["fridayEvening", "mondayOnetime", "weekends"],
    ],
    [
      "a day and a time together",
      "availability=days~Monday&availability=times~17-20",
      ["mondayOnetime"],
    ],
    [
      "occasional",
      "availability=occasional~weekends",
      ["saturdayMorning", "weekends"],
    ],
    [
      "occasional and a time",
      "availability=occasional~weekends&availability=times~17-20",
      ["weekends"],
    ],
    [
      "a day covered by occasional with a time",
      "availability=days~Sunday&availability=times~08-11",
      ["weekends"],
    ],
    ["an empty value", "availability=", ALL],
    ["an unknown day", "availability=days~Someday", []],
    ["a day in the wrong case", "availability=days~monday", []],
    ["a time outside the time slots", "availability=times~09-12", []],
    ["the wrong separator", "availability=days|Monday", []],
  ];

  const ids = (res: { json: () => { data: { id: number }[] } }) =>
    res.json().data.map(({ id }) => id);
  const expectedIds = <K extends string>(
    entities: Record<K, { id: number }>,
    keys: K[],
  ) => keys.map((k) => entities[k].id).sort();
  const own = (entities: Record<string, { id: number }>, list: number[]) =>
    list
      .filter((id) => Object.values(entities).some((e) => e.id === id))
      .sort();

  it.each(cases)("filters volunteers by %s", async (_, query, expected) => {
    const res = await get(
      `/volunteer?limit=50&filter[search]=Slot${suffix}&${query.replaceAll("availability=", "filter[availability]=")}`,
    );
    expect(res.statusCode).toBe(200);
    expect(own(volunteers, ids(res))).toEqual(
      expectedIds(volunteers, expected),
    );
  });

  it.each(cases)("filters opportunities by %s", async (_, query, expected) => {
    const res = await get(
      `/opportunity?limit=100&filter[search]=${suffix}&${query.replaceAll("availability=", "filter[availability]=")}`,
    );
    expect(res.statusCode).toBe(200);
    expect(own(opportunities, ids(res))).toEqual(
      expectedIds(opportunities, expected),
    );
  });

  it.each(cases)(
    "filters a volunteer's opportunities by %s",
    async (_, query, expected) => {
      const res = await get(
        `/volunteer/opportunity?limit=100&type=${OpportunityType.REGULAR}&status=${OpportunityStatusType.SEARCHING}&agentId=${agent.id}&${query}`,
      );
      expect(res.statusCode).toBe(200);
      expect(own(opportunities, ids(res))).toEqual(
        expectedIds(opportunities, expected),
      );
    },
  );

  const onetimerCases: [string, string, OnetimerKey[]][] = [
    ["its day", "availability=days~Tuesday", ["eventMoved"]],
    ["a stale timeslot day", "availability=days~Monday", []],
    [
      "a day without timeslots",
      "availability=days~Wednesday",
      ["accompanying"],
    ],
    ["its time", "availability=times~17-20", ["eventMoved"]],
    [
      "its day and time",
      "availability=days~Wednesday&availability=times~08-11",
      ["accompanying"],
    ],
    [
      "occasional",
      "availability=occasional~weekdays",
      ["eventMoved", "accompanying"],
    ],
  ];

  it.each(onetimerCases)(
    "filters onetimer opportunities by %s",
    async (_, query, expected) => {
      const res = await get(
        `/opportunity?limit=100&filter[search]=${suffix}&${query.replaceAll("availability=", "filter[availability]=")}`,
      );
      expect(res.statusCode).toBe(200);
      expect(own(onetimerOpportunities, ids(res))).toEqual(
        expectedIds(onetimerOpportunities, expected),
      );
    },
  );

  it("filters a volunteer's onetimer opportunities by onetimer date", async () => {
    const res = await get(
      `/volunteer/opportunity?limit=100&type=${OpportunityType.EVENTS}&status=${OpportunityStatusType.SEARCHING}&agentId=${agent.id}&availability=days~Tuesday`,
    );
    expect(res.statusCode).toBe(200);
    expect(own(onetimerOpportunities, ids(res))).toEqual(
      expectedIds(onetimerOpportunities, ["eventMoved"]),
    );
  });

  it("applies non-column filters on a volunteer's opportunities", async () => {
    const res = await get(
      `/volunteer/opportunity?limit=100&type=${OpportunityType.REGULAR}&status=${OpportunityStatusType.SEARCHING}&agentId=${agent.id}&search=fridayEvening%20${suffix}`,
    );
    expect(res.statusCode).toBe(200);
    expect(own(opportunities, ids(res))).toEqual(
      expectedIds(opportunities, ["fridayEvening"]),
    );
  });

  it("moves an event's one-time timeslot when PATCH changes its date", async () => {
    const deal = await dealWith(DealType.VOLUNTEER, SLOTS.mondayMorning);
    const stale = await getRepository(dataSource, Timeslot).save(
      new Timeslot({ start: new Date("2026-01-12T18:00:00+01:00") }),
    );
    timeslots.push(stale);
    await getRepository(dataSource, DealTimeslot).save(
      new DealTimeslot({ dealId: deal.id, timeslotId: stale.id }),
    );
    const onetimer = await getRepository(dataSource, Onetimer).save(
      new Onetimer({ date: stale.start }),
    );
    onetimers.push(onetimer);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Availability eventPatched ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.SEARCHING,
        dealId: deal.id,
        onetimerId: onetimer.id,
        agentId: agent.id,
      }),
    );
    extraOpportunities.push(opportunity);

    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: cookie },
      payload: {
        opportunity_type: OpportunityType.EVENTS,
        event: { date: "2026-01-15", time: "18:00" },
      },
    });
    expect(res.statusCode).toBe(204);

    const slots = await getRepository(dataSource, DealTimeslot).find({
      where: { dealId: deal.id },
      relations: { timeslot: true },
    });
    for (const { timeslot } of slots) {
      if (!timeslots.some(({ id }) => id === timeslot.id)) {
        timeslots.push(timeslot);
      }
    }
    const date = (
      await getRepository(dataSource, Onetimer).findOneByOrFail({
        id: onetimer.id,
      })
    ).date;
    expect(
      slots
        .filter(({ timeslot }) => !timeslot.rrule)
        .map(({ timeslot }) => timeslot.start.getTime()),
    ).toEqual([new Date(date).getTime()]);
    expect(slots.filter(({ timeslot }) => timeslot.rrule)).toHaveLength(1);

    const thursday = await get(
      `/opportunity?limit=100&filter[search]=${suffix}&filter[availability]=days~Thursday`,
    );
    expect(ids(thursday)).toContain(opportunity.id);
  });
});
