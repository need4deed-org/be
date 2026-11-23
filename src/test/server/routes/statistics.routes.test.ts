import { FastifyInstance } from "fastify";
import {
  ApiStatisticsGet,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  STATISTICS_UNKNOWN_KEY,
  StatisticsMetric,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import LeadFrom from "../../../data/entity/lead.entity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import StatisticsEvent, {
  LEAD_FROM_METRIC,
} from "../../../data/entity/statistics-event.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

// Rows are back-dated to 1985 so parallel test files never land in these periods.
async function backdate(table: string, id: number, instant: string) {
  const column = table === "statistics_event" ? "occurred_at" : "created_at";
  await dataSource.query(
    `UPDATE ${table} SET ${column} = $1::timestamptz WHERE id = $2`,
    [instant, id],
  );
}

describe("GET /statistics/:metric", () => {
  let fastify: FastifyInstance;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  let mitteId: string;
  let pankowId: string;
  let lead: LeadFrom;
  let agent: Agent;
  const createdIds = {
    users: [] as number[],
    persons: [] as number[],
    deals: [] as number[],
    volunteers: [] as number[],
    opportunities: [] as number[],
    events: [] as number[],
  };

  async function login(role: UserRole): Promise<string> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Stats", lastName: role }),
    );
    createdIds.persons.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `stats-${role}-${randomNumericSuffix()}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    createdIds.users.push(user.id);
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    const cookie = response.cookies.find(
      ({ name }) => name === accessCookieName,
    );
    if (!cookie) {
      throw new Error("login failed");
    }
    return cookie.value;
  }

  async function createVolunteer(
    instant: string,
    statusType: ProfileVolunteeringType | null,
    districtIds: string[],
    email?: string,
  ) {
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    createdIds.deals.push(deal.id);
    for (const districtId of districtIds) {
      await dataSource
        .getRepository(DealDistrict)
        .save(
          new DealDistrict({ dealId: deal.id, districtId: Number(districtId) }),
        );
    }
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Stats", lastName: "Volunteer", email }),
    );
    createdIds.persons.push(person.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: deal.id,
        personId: person.id,
        ...(statusType ? { statusType } : {}),
      }),
    );
    createdIds.volunteers.push(volunteer.id);
    await backdate("volunteer", volunteer.id, instant);
    return volunteer;
  }

  async function createOpportunity(type: OpportunityType, instant: string) {
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({ title: `Stats ${randomNumericSuffix()}`, type }),
    );
    createdIds.opportunities.push(opportunity.id);
    await backdate("opportunity", opportunity.id, instant);
    return opportunity;
  }

  async function createMatch(
    opportunity: Opportunity,
    volunteer: Volunteer,
    status: OpportunityVolunteerStatusType,
    instant: string,
  ) {
    const match = await dataSource.getRepository(OpportunityVolunteer).save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status,
      }),
    );
    await backdate("opportunity_volunteer", match.id, instant);
  }

  async function createEvent(
    metric: string,
    valueKey: string,
    instant: string,
    fields: Partial<StatisticsEvent> = {},
  ) {
    const event = await dataSource
      .getRepository(StatisticsEvent)
      .save(new StatisticsEvent({ metric, valueKey, ...fields }));
    createdIds.events.push(event.id);
    await backdate("statistics_event", event.id, instant);
  }

  async function get(url: string, cookie = coordinatorCookie) {
    return fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });
  }

  async function getData(url: string): Promise<ApiStatisticsGet> {
    const response = await get(url);
    expect(response.statusCode, response.body).toBe(200);
    return response.json().data;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    coordinatorCookie = await login(UserRole.COORDINATOR);
    volunteerCookie = await login(UserRole.VOLUNTEER);

    const districts: { id: number; title: string }[] = await dataSource.query(
      "SELECT id, title FROM district WHERE title IN ('Mitte', 'Pankow')",
    );
    mitteId = String(districts.find(({ title }) => title === "Mitte")!.id);
    pankowId = String(districts.find(({ title }) => title === "Pankow")!.id);

    await createVolunteer(
      "1985-01-31T23:30:00Z",
      ProfileVolunteeringType.ACCOMPANYING,
      [mitteId, pankowId],
    );
    const repeatEmail = `stats-${randomNumericSuffix()}@test.need4deed.org`;
    await createVolunteer(
      "1985-02-10T12:00:00Z",
      ProfileVolunteeringType.REGULAR,
      [],
      repeatEmail,
    );
    await createVolunteer(
      "1985-02-20T12:00:00Z",
      ProfileVolunteeringType.REGULAR,
      [],
      repeatEmail.toUpperCase(),
    );
    await createVolunteer("1985-06-30T22:30:00Z", null, []);

    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Stats ${randomNumericSuffix()}`,
        type: OpportunityType.EVENTS,
      }),
    );
    createdIds.opportunities.push(opportunity.id);
    await backdate("opportunity", opportunity.id, "1985-05-05T10:00:00Z");

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Stats agent ${randomNumericSuffix()}`,
        districtId: Number(pankowId),
      }),
    );
    const agentOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Stats ${randomNumericSuffix()}`,
        type: OpportunityType.REGULAR,
        agentId: agent.id,
      }),
    );
    createdIds.opportunities.push(agentOpportunity.id);
    await backdate("opportunity", agentOpportunity.id, "1985-05-06T10:00:00Z");

    // Match fixtures live in 1986, away from the 1985 request counts.
    const first = await createVolunteer("1986-01-01T12:00:00Z", null, []);
    const second = await createVolunteer("1986-01-01T12:00:00Z", null, []);
    const regular = await createOpportunity(
      OpportunityType.REGULAR,
      "1986-01-05T12:00:00Z",
    );
    const event = await createOpportunity(
      OpportunityType.EVENTS,
      "1986-01-06T12:00:00Z",
    );
    const pendingOnly = await createOpportunity(
      OpportunityType.ACCOMPANYING,
      "1986-01-07T12:00:00Z",
    );
    await createOpportunity(OpportunityType.REGULAR, "1986-02-01T12:00:00Z");
    const { MATCHED, ACTIVE, PAST, PENDING } = OpportunityVolunteerStatusType;
    await createMatch(regular, first, MATCHED, "1986-02-10T12:00:00Z");
    await createMatch(regular, second, PENDING, "1986-01-25T12:00:00Z");
    await createMatch(event, second, ACTIVE, "1986-02-15T12:00:00Z");
    await createMatch(event, first, PAST, "1986-03-01T12:00:00Z");
    await createMatch(pendingOnly, second, PENDING, "1986-01-20T12:00:00Z");

    lead = await dataSource
      .getRepository(LeadFrom)
      .save(
        new LeadFrom({ title: `Stats ${randomNumericSuffix()}`, count: 5 }),
      );
    for (const instant of ["1985-03-01T10:00:00Z", "1985-03-20T10:00:00Z"]) {
      const event = await dataSource.getRepository(StatisticsEvent).save(
        new StatisticsEvent({
          metric: LEAD_FROM_METRIC,
          valueKey: String(lead.id),
        }),
      );
      createdIds.events.push(event.id);
      await backdate("statistics_event", event.id, instant);
    }
  });

  // Status events and month-end snapshots live in 1987.
  beforeAll(async () => {
    const { PAST_OPPORTUNITIES, ACTIVE_VOLUNTEERS } = StatisticsMetric;
    const { REGULAR, ACCOMPANYING } = ProfileVolunteeringType;
    await createEvent(PAST_OPPORTUNITIES, "-1", "1987-01-10T12:00:00Z", {
      opportunityType: OpportunityType.REGULAR,
      districtId: Number(mitteId),
    });
    await createEvent(PAST_OPPORTUNITIES, "-2", "1987-02-10T12:00:00Z", {
      opportunityType: OpportunityType.EVENTS,
    });
    const januaryEnd = "1987-01-31T22:59:59.999Z";
    await createEvent(ACTIVE_VOLUNTEERS, `${REGULAR}#1`, januaryEnd, {
      districtId: Number(mitteId),
    });
    await createEvent(ACTIVE_VOLUNTEERS, `${REGULAR}#1`, januaryEnd, {
      districtId: Number(pankowId),
    });
    await createEvent(ACTIVE_VOLUNTEERS, `${ACCOMPANYING}#2`, januaryEnd);
    await createEvent(
      ACTIVE_VOLUNTEERS,
      `${REGULAR}#1`,
      "1987-02-28T22:59:59.999Z",
      { districtId: Number(mitteId) },
    );
  });

  afterAll(async () => {
    const remove = (table: string, ids: number[]) =>
      ids.length
        ? dataSource.query(`DELETE FROM "${table}" WHERE id = ANY($1)`, [ids])
        : undefined;
    await remove("statistics_event", createdIds.events);
    await remove("lead_from", lead ? [lead.id] : []);
    await remove("opportunity", createdIds.opportunities);
    await remove("agent", agent ? [agent.id] : []);
    await remove("volunteer", createdIds.volunteers);
    await remove("deal", createdIds.deals);
    await remove("user", createdIds.users);
    await remove("person", createdIds.persons);
    await fastify.close();
  });

  it("buckets by Berlin month, fills empty periods, skips repeat registrations", async () => {
    const data = await getData(
      "/statistics/new-volunteers?granularity=month&from=1985-01-01&to=1985-04-01",
    );

    expect(data.periods.map(({ period }) => period)).toEqual([
      "1985-01",
      "1985-02",
      "1985-03",
    ]);
    expect(data.periods[0]).toMatchObject({ counts: {}, total: 0 });
    expect(data.periods[1]).toMatchObject({ counts: { total: 2 }, total: 2 });
    expect(data.allowedGroupBy).toEqual(["none", "volunteer-type", "district"]);
  });

  it("widens a partial range to whole periods", async () => {
    const data = await getData(
      "/statistics/new-volunteers?granularity=month&from=1985-02-15&to=1985-02-16",
    );

    expect(data.periods).toEqual([
      {
        period: "1985-02",
        start: "1985-01-31T23:00:00.000Z",
        counts: { total: 2 },
        total: 2,
      },
    ]);
  });

  it("counts a volunteer once in total when in several districts", async () => {
    const data = await getData(
      "/statistics/new-volunteers?granularity=month&from=1985-02-01&to=1985-03-01&groupBy=district",
    );

    expect(data.periods[0].counts).toEqual({
      [mitteId]: 1,
      [pankowId]: 1,
      [STATISTICS_UNKNOWN_KEY]: 1,
    });
    expect(data.periods[0].total).toBe(2);
    expect(data.groups.map(({ key }) => key)).toEqual(
      expect.arrayContaining([mitteId, pankowId, STATISTICS_UNKNOWN_KEY]),
    );
    expect(data.groups.find(({ key }) => key === mitteId)?.title).toEqual({
      en: "Mitte",
      de: "Mitte",
    });
  });

  it("buckets by Berlin quarter across summer time", async () => {
    const data = await getData(
      "/statistics/new-volunteers?granularity=quarter&from=1985-01-01&to=1986-01-01&groupBy=volunteer-type",
    );

    expect(data.periods.map(({ period }) => period)).toEqual([
      "1985-Q1",
      "1985-Q2",
      "1985-Q3",
      "1985-Q4",
    ]);
    expect(data.periods[0].counts).toEqual({ accompanying: 1, regular: 1 });
    expect(data.periods[2]).toMatchObject({
      start: "1985-06-30T22:00:00.000Z",
      counts: { [STATISTICS_UNKNOWN_KEY]: 1 },
    });
    expect(data.groups.map(({ key }) => key)).toEqual([
      ...Object.values(ProfileVolunteeringType),
      STATISTICS_UNKNOWN_KEY,
    ]);
  });

  it("counts requests by opportunity type per year", async () => {
    const data = await getData(
      "/statistics/requests?granularity=year&from=1985-01-01&to=1986-01-01&groupBy=opportunity-type",
    );

    expect(data.periods).toEqual([
      {
        period: "1985",
        start: "1984-12-31T23:00:00.000Z",
        counts: { [OpportunityType.EVENTS]: 1, [OpportunityType.REGULAR]: 1 },
        total: 2,
      },
    ]);
    expect(data.groups.map(({ key }) => key)).toEqual(
      Object.values(OpportunityType),
    );
  });

  it("falls back to the agent's district for a request without one", async () => {
    const data = await getData(
      "/statistics/requests?granularity=year&from=1985-01-01&to=1986-01-01&groupBy=district",
    );

    expect(data.periods[0]).toMatchObject({
      counts: { [pankowId]: 1, [STATISTICS_UNKNOWN_KEY]: 1 },
      total: 2,
    });
  });

  it("counts heard-about-us answers and the totals before tracking", async () => {
    const data = await getData(
      "/statistics/lead-from?granularity=month&from=1985-03-01&to=1985-04-01&groupBy=lead-from",
    );

    expect(data.periods[0].counts).toEqual({ [String(lead.id)]: 2 });
    expect(data.groups.find(({ key }) => key === String(lead.id))).toEqual({
      key: String(lead.id),
      title: { en: lead.title, de: lead.title },
    });
    expect(data.totalsBeforeTracking?.[String(lead.id)]).toBe(3);
  });

  it("returns the totals before tracking only when split by answer", async () => {
    const data = await getData(
      "/statistics/lead-from?granularity=month&from=1985-03-01&to=1985-04-01",
    );

    expect(data.periods[0]).toMatchObject({ counts: { total: 2 }, total: 2 });
    expect(data.totalsBeforeTracking).toBeUndefined();
  });

  it("counts matched volunteers per month, by opportunity type", async () => {
    const data = await getData(
      "/statistics/matched-volunteers?granularity=month&from=1986-01-01&to=1986-04-01&groupBy=opportunity-type",
    );

    expect(
      data.periods.map(({ counts, total }) => ({ counts, total })),
    ).toEqual([
      { counts: {}, total: 0 },
      {
        counts: {
          [OpportunityType.REGULAR]: 1,
          [OpportunityType.EVENTS]: 1,
        },
        total: 2,
      },
      { counts: { [OpportunityType.EVENTS]: 1 }, total: 1 },
    ]);
    expect(data.allowedGroupBy).toEqual(["none", "opportunity-type"]);
  });

  it("counts a matched opportunity once, in the month of its first match", async () => {
    const data = await getData(
      "/statistics/matched-opportunities?granularity=month&from=1986-01-01&to=1986-04-01&groupBy=opportunity-type",
    );

    expect(
      data.periods.map(({ counts, total }) => ({ counts, total })),
    ).toEqual([
      { counts: {}, total: 0 },
      {
        counts: {
          [OpportunityType.REGULAR]: 1,
          [OpportunityType.EVENTS]: 1,
        },
        total: 2,
      },
      { counts: {}, total: 0 },
    ]);
  });

  it("groups matched opportunities by district", async () => {
    const data = await getData(
      "/statistics/matched-opportunities?granularity=month&from=1986-02-01&to=1986-03-01&groupBy=district",
    );

    expect(data.periods[0].total).toBe(2);
  });

  it("counts opportunities never matched, pending ones included", async () => {
    const data = await getData(
      "/statistics/unmatched-opportunities?granularity=year&from=1986-01-01&to=1987-01-01&groupBy=opportunity-type",
    );

    expect(data.periods[0]).toMatchObject({
      counts: {
        [OpportunityType.ACCOMPANYING]: 1,
        [OpportunityType.REGULAR]: 1,
      },
      total: 2,
    });
  });

  it("counts new opportunities like requests", async () => {
    const url =
      "granularity=year&from=1985-01-01&to=1986-01-01&groupBy=district";
    const opportunities = await getData(`/statistics/new-opportunities?${url}`);
    const requests = await getData(`/statistics/requests?${url}`);

    expect(opportunities.periods).toEqual(requests.periods);
  });

  it("counts past opportunities by type and by district", async () => {
    const query = "granularity=month&from=1987-01-01&to=1987-03-01";
    const byType = await getData(
      `/statistics/past-opportunities?${query}&groupBy=opportunity-type`,
    );
    const byDistrict = await getData(
      `/statistics/past-opportunities?${query}&groupBy=district`,
    );

    expect(byType.periods.map(({ counts }) => counts)).toEqual([
      { [OpportunityType.REGULAR]: 1 },
      { [OpportunityType.EVENTS]: 1 },
    ]);
    expect(byDistrict.periods.map(({ counts }) => counts)).toEqual([
      { [mitteId]: 1 },
      { [STATISTICS_UNKNOWN_KEY]: 1 },
    ]);
    expect(byType.allowedGroupBy).toEqual([
      "none",
      "opportunity-type",
      "district",
    ]);
  });

  it("counts a month-end snapshot volunteer once across districts", async () => {
    const query = "granularity=month&from=1987-01-01&to=1987-03-01";
    const byDistrict = await getData(
      `/statistics/active-volunteers?${query}&groupBy=district`,
    );
    const byType = await getData(
      `/statistics/active-volunteers?${query}&groupBy=volunteer-type`,
    );

    expect(byDistrict.periods[0]).toMatchObject({
      counts: { [mitteId]: 1, [pankowId]: 1, [STATISTICS_UNKNOWN_KEY]: 1 },
      total: 2,
    });
    expect(
      byType.periods.map(({ counts, total }) => ({ counts, total })),
    ).toEqual([
      {
        counts: {
          [ProfileVolunteeringType.REGULAR]: 1,
          [ProfileVolunteeringType.ACCOMPANYING]: 1,
        },
        total: 2,
      },
      { counts: { [ProfileVolunteeringType.REGULAR]: 1 }, total: 1 },
    ]);
  });

  it("shows a quarter's latest month-end snapshot", async () => {
    const data = await getData(
      "/statistics/active-volunteers?granularity=quarter&from=1987-01-01&to=1987-04-01",
    );

    expect(data.periods[0]).toMatchObject({ period: "1987-Q1", total: 1 });
  });

  it("rejects a groupBy the metric does not support", async () => {
    const response = await get(
      "/statistics/new-volunteers?granularity=month&groupBy=lead-from",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects an empty range", async () => {
    const response = await get(
      "/statistics/requests?granularity=month&from=1985-03-01&to=1985-03-01",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects an empty range inside one period", async () => {
    const response = await get(
      "/statistics/requests?granularity=month&from=1985-03-15&to=1985-03-15",
    );
    expect(response.statusCode).toBe(400);
  });

  it('returns the period before "to" when it precedes every record', async () => {
    const data = await getData(
      "/statistics/requests?granularity=year&to=1900-01-01",
    );

    expect(data.periods).toEqual([
      expect.objectContaining({ period: "1899", counts: {}, total: 0 }),
    ]);
  });

  it("rejects a range that starts after the current period", async () => {
    const response = await get(
      "/statistics/requests?granularity=month&from=2999-01-01",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects a range of more than 1000 periods", async () => {
    const response = await get(
      "/statistics/requests?granularity=month&from=1000-01-01&to=1985-01-01",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects a missing granularity and an unknown metric", async () => {
    expect((await get("/statistics/requests")).statusCode).toBe(400);
    expect(
      (await get("/statistics/matches?granularity=month")).statusCode,
    ).toBe(400);
  });

  it("is for coordinators only", async () => {
    const response = await get(
      "/statistics/requests?granularity=month",
      volunteerCookie,
    );
    expect(response.statusCode).toBe(403);
  });
});
