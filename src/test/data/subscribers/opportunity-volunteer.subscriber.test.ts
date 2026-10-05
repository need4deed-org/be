import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { randomNumericSuffix } from "../../random";
import { createOpportunity, createVolunteer } from "../match-fixtures";

// be#1106. Everything runs inside one uncommitted transaction: the recompute
// must see rows the transaction itself wrote, which the old fire-and-forget
// entity hooks (reading via a separate connection) could not.
describe("OpportunityVolunteerSubscriber", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  let volunteer: Volunteer;
  let opportunity: Opportunity;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    volunteer = await createVolunteer(queryRunner.manager);
    opportunity = await createOpportunity(
      queryRunner.manager,
      `Subscriber ${suffix}`,
    );
  });

  afterEach(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const statuses = async () => [
    (await queryRunner.manager.findOneByOrFail(Volunteer, { id: volunteer.id }))
      .statusMatch,
    (
      await queryRunner.manager.findOneByOrFail(Opportunity, {
        id: opportunity.id,
      })
    ).statusMatch,
  ];

  const link = (status: OpportunityVolunteerStatusType) =>
    queryRunner.manager.save(
      new OpportunityVolunteer({
        volunteerId: volunteer.id,
        opportunityId: opportunity.id,
        status,
      }),
    );

  it("recomputes both sides on insert, within the transaction", async () => {
    await link(OpportunityVolunteerStatusType.PENDING);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.PENDING_MATCH,
      OpportunityMatchStatusType.PENDING_MATCH,
    ]);
  });

  it("recomputes both sides on update", async () => {
    const ov = await link(OpportunityVolunteerStatusType.PENDING);
    ov.status = OpportunityVolunteerStatusType.ACTIVE;
    await queryRunner.manager.save(ov);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.MATCHED,
      OpportunityMatchStatusType.MATCHED,
    ]);
  });

  it("recomputes both sides on remove", async () => {
    const ov = await link(OpportunityVolunteerStatusType.MATCHED);
    await queryRunner.manager.remove(ov);

    expect(await statuses()).toEqual([
      VolunteerStateMatchType.NEEDS_REMATCH,
      OpportunityMatchStatusType.NEEDS_REMATCH,
    ]);
  });
});
