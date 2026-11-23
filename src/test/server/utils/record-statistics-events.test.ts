import {
  OpportunityStatusType,
  OpportunityType,
  ProfileVolunteeringType,
  StatisticsMetric,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import StatisticsEvent from "../../../data/entity/statistics-event.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import {
  EMPTY_SNAPSHOT_MARKER_KEY,
  recordOpportunityStatusEvents,
  recordVolunteerSnapshots,
} from "../../../server/utils/data/record-statistics-events";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const { PAST_OPPORTUNITIES, VALIDATED_OPPORTUNITIES } = StatisticsMetric;
const { ACTIVE_VOLUNTEERS, AVAILABLE_VOLUNTEERS } = StatisticsMetric;
const SKIPPED = {
  [ACTIVE_VOLUNTEERS]: "skipped",
  [AVAILABLE_VOLUNTEERS]: "skipped",
};

describe("recordOpportunityStatusEvents", () => {
  let district: District;
  let agent: Agent;
  let past: Opportunity;
  let searching: Opportunity;
  let fresh: Opportunity;
  let ids: number[];

  const events = async () =>
    (
      await dataSource.getRepository(StatisticsEvent).find({
        where: {
          metric: In([PAST_OPPORTUNITIES, VALIDATED_OPPORTUNITIES]),
          valueKey: In(ids.map(String)),
        },
        order: { metric: "ASC", valueKey: "ASC" },
      })
    ).map(({ metric, valueKey, districtId, opportunityType }) => ({
      metric,
      valueKey,
      districtId,
      opportunityType,
    }));

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    district = await dataSource
      .getRepository(District)
      .save(new District({ title: `Stats ${randomNumericSuffix()}` }));
    agent = await dataSource.getRepository(Agent).save(
      new Agent({
        title: `Stats agent ${randomNumericSuffix()}`,
        districtId: district.id,
      }),
    );
    const save = (type: OpportunityType, status: OpportunityStatusType) =>
      dataSource.getRepository(Opportunity).save(
        new Opportunity({
          title: `Stats ${randomNumericSuffix()}`,
          type,
          status,
          agentId: agent.id,
        }),
      );
    past = await save(OpportunityType.EVENTS, OpportunityStatusType.PAST);
    searching = await save(
      OpportunityType.REGULAR,
      OpportunityStatusType.SEARCHING,
    );
    fresh = await save(OpportunityType.REGULAR, OpportunityStatusType.NEW);
    ids = [past.id, searching.id, fresh.id];
  });

  afterAll(async () => {
    await dataSource.getRepository(StatisticsEvent).delete({
      metric: In([PAST_OPPORTUNITIES, VALIDATED_OPPORTUNITIES]),
      valueKey: In(ids.map(String)),
    });
    await dataSource.getRepository(Opportunity).delete({ id: In(ids) });
    await dataSource.getRepository(Agent).delete({ id: agent.id });
    await dataSource.getRepository(District).delete({ id: district.id });
  });

  it("records an opportunity once, when it first enters a status", async () => {
    await recordOpportunityStatusEvents(dataSource.manager, new Date(), ids);
    await recordOpportunityStatusEvents(dataSource.manager, new Date(), ids);

    const expected = (opportunity: Opportunity, metric: StatisticsMetric) => ({
      metric,
      valueKey: String(opportunity.id),
      districtId: district.id,
      opportunityType: opportunity.type,
    });
    expect(await events()).toEqual(
      [
        expected(past, PAST_OPPORTUNITIES),
        expected(past, VALIDATED_OPPORTUNITIES),
        expected(searching, VALIDATED_OPPORTUNITIES),
      ].sort((a, b) =>
        `${a.metric}${a.valueKey}`.localeCompare(`${b.metric}${b.valueKey}`),
      ),
    );
  });

  it("records a later status change on the next run", async () => {
    await dataSource
      .getRepository(Opportunity)
      .update(fresh.id, { status: OpportunityStatusType.ACTIVE });

    const recorded = await recordOpportunityStatusEvents(
      dataSource.manager,
      new Date(),
      ids,
    );

    expect(recorded).toEqual({
      [PAST_OPPORTUNITIES]: 0,
      [VALIDATED_OPPORTUNITIES]: 1,
    });
  });
});

describe("recordVolunteerSnapshots", () => {
  const year = 1950 + Math.floor(Math.random() * 30);
  const monthStart = new Date(`${year}-03-01T00:00:00+01:00`);
  const previousMonthStart = new Date(`${year}-02-01T00:00:00+01:00`);
  const berlinMorning = (day: number, month = "03") =>
    new Date(`${year}-${month}-0${day}T06:00:00+01:00`);
  const aprilStart = new Date(`${year}-04-01T00:00:00+01:00`);
  const mayStart = new Date(`${year}-05-01T00:00:00+01:00`);
  const createdIds = {
    districts: [] as number[],
    deals: [] as number[],
    persons: [] as number[],
    volunteers: [] as number[],
  };
  let first: District;
  let second: District;
  let postcode: Postcode;

  const snapshot = (
    metric: StatisticsMetric,
  ): Promise<{ valueKey: string; districtId: number; occurredAt: Date }[]> =>
    dataSource.query(
      `SELECT value_key AS "valueKey", district_id AS "districtId", occurred_at AS "occurredAt"
       FROM statistics_event
       WHERE metric = $1 AND occurred_at >= $2 AND occurred_at < $3`,
      [metric, previousMonthStart, monthStart],
    );

  const mine = async (metric: StatisticsMetric) =>
    (await snapshot(metric)).filter(({ districtId }) =>
      createdIds.districts.includes(districtId),
    );

  async function createVolunteer(
    statusEngagement: VolunteerStateEngagementType,
    statusType: ProfileVolunteeringType,
    districts: District[],
    email?: string,
  ) {
    const deal = await dataSource
      .getRepository(Deal)
      .save(new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }));
    createdIds.deals.push(deal.id);
    for (const district of districts) {
      await dataSource
        .getRepository(DealDistrict)
        .save(new DealDistrict({ dealId: deal.id, districtId: district.id }));
    }
    const person = await dataSource
      .getRepository(Person)
      .save(new Person({ firstName: "Stats", lastName: "Snapshot", email }));
    createdIds.persons.push(person.id);
    const volunteer = await dataSource.getRepository(Volunteer).save(
      new Volunteer({
        dealId: deal.id,
        personId: person.id,
        statusEngagement,
        statusType,
      }),
    );
    createdIds.volunteers.push(volunteer.id);
  }

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    postcode = await firstSeeded(dataSource.getRepository(Postcode));
    const repo = dataSource.getRepository(District);
    first = await repo.save(
      new District({ title: `Stats ${randomNumericSuffix()}` }),
    );
    second = await repo.save(
      new District({ title: `Stats ${randomNumericSuffix()}` }),
    );
    createdIds.districts.push(first.id, second.id);

    const { ACTIVE, AVAILABLE, INACTIVE } = VolunteerStateEngagementType;
    const { REGULAR, ACCOMPANYING } = ProfileVolunteeringType;
    const email = `snapshot-${randomNumericSuffix()}@test.need4deed.org`;
    await createVolunteer(ACTIVE, REGULAR, [first, second], email);
    await createVolunteer(ACTIVE, ACCOMPANYING, [first]);
    await createVolunteer(AVAILABLE, REGULAR, [second]);
    await createVolunteer(INACTIVE, REGULAR, [first, second]);
    await createVolunteer(ACTIVE, ACCOMPANYING, [second], email.toUpperCase());
  });

  afterAll(async () => {
    await dataSource.query(
      `DELETE FROM statistics_event
       WHERE metric = ANY($1) AND occurred_at >= $2 AND occurred_at < $3`,
      [[ACTIVE_VOLUNTEERS, AVAILABLE_VOLUNTEERS], previousMonthStart, mayStart],
    );
    const remove = (table: string, ids: number[]) =>
      dataSource.query(`DELETE FROM "${table}" WHERE id = ANY($1)`, [ids]);
    await remove("volunteer", createdIds.volunteers);
    await remove("deal", createdIds.deals);
    await remove("person", createdIds.persons);
    await remove("district", createdIds.districts);
  });

  it("skips the snapshot after the catch-up days", async () => {
    const recorded = await recordVolunteerSnapshots(
      dataSource.manager,
      berlinMorning(4),
      createdIds.volunteers,
    );

    expect(recorded).toEqual(SKIPPED);
    expect(await mine(ACTIVE_VOLUNTEERS)).toEqual([]);
  });

  it("writes the previous month-end snapshot once, one row per district, without repeat registrations", async () => {
    await recordVolunteerSnapshots(
      dataSource.manager,
      berlinMorning(1),
      createdIds.volunteers,
    );
    const repeat = await recordVolunteerSnapshots(
      dataSource.manager,
      berlinMorning(2),
      createdIds.volunteers,
    );
    expect(repeat).toEqual(SKIPPED);

    const rows = await mine(ACTIVE_VOLUNTEERS);
    expect(
      rows.every(
        ({ occurredAt }) => monthStart.getTime() - occurredAt.getTime() === 1,
      ),
    ).toBe(true);
    const districtsByKey = new Map<string, number[]>();
    for (const { valueKey, districtId } of rows) {
      districtsByKey.set(valueKey, [
        ...(districtsByKey.get(valueKey) ?? []),
        districtId,
      ]);
    }
    expect(
      [...districtsByKey.entries()]
        .map(([key, districts]) => [key.split("#")[0], districts.sort()])
        .sort(),
    ).toEqual(
      [
        [ProfileVolunteeringType.ACCOMPANYING, [first.id]],
        [ProfileVolunteeringType.REGULAR, [first.id, second.id].sort()],
      ].sort(),
    );
    expect(await mine(AVAILABLE_VOLUNTEERS)).toHaveLength(1);
  });

  it("keeps an empty month-end snapshot from a later catch-up", async () => {
    const empty = await recordVolunteerSnapshots(
      dataSource.manager,
      berlinMorning(1, "05"),
      [],
    );
    const catchUp = await recordVolunteerSnapshots(
      dataSource.manager,
      berlinMorning(2, "05"),
      createdIds.volunteers,
    );

    expect(empty).toEqual({
      [ACTIVE_VOLUNTEERS]: 0,
      [AVAILABLE_VOLUNTEERS]: 0,
    });
    expect(catchUp).toEqual(SKIPPED);
    const april: { valueKey: string }[] = await dataSource.query(
      `SELECT value_key AS "valueKey" FROM statistics_event
       WHERE metric = $1 AND occurred_at >= $2 AND occurred_at < $3`,
      [ACTIVE_VOLUNTEERS, aprilStart, mayStart],
    );
    expect(april).toEqual([{ valueKey: EMPTY_SNAPSHOT_MARKER_KEY }]);
  });
});
