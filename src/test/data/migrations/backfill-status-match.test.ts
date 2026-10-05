import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { BackfillStatusMatch1791198309725 } from "../../../data/migrations/1791198309725-backfill-status-match";
import { randomNumericSuffix } from "../../random";
import { createOpportunity, createVolunteer } from "../match-fixtures";

// be#1106. The migration updates every volunteer and opportunity, and other
// test files share this database, so it runs inside a transaction that is
// rolled back.
describe("BackfillStatusMatch migration", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  const v: Record<string, Volunteer> = {};
  const o: Record<string, Opportunity> = {};

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;

    for (const key of ["pending", "unlinked", "past", "untouched"]) {
      v[key] = await createVolunteer(manager);
    }
    for (const key of ["matched", "unlinked", "unmatched"]) {
      o[key] = await createOpportunity(manager, `Backfill ${key} ${suffix}`);
    }

    const links: [Volunteer, OpportunityVolunteerStatusType][] = [
      [v.pending, OpportunityVolunteerStatusType.PENDING],
      [v.past, OpportunityVolunteerStatusType.MATCHED],
    ];
    for (const [volunteer, status] of links) {
      await manager.save(
        new OpportunityVolunteer({
          volunteerId: volunteer.id,
          opportunityId: o.matched.id,
          status,
        }),
      );
    }

    // Stale values, written after the links so the subscriber can't fix them.
    const stale: [typeof Volunteer | typeof Opportunity, number, string][] = [
      [Volunteer, v.pending.id, VolunteerStateMatchType.NO_MATCHES],
      [Volunteer, v.unlinked.id, VolunteerStateMatchType.MATCHED],
      [Volunteer, v.past.id, VolunteerStateMatchType.PAST],
      [Volunteer, v.untouched.id, VolunteerStateMatchType.NO_MATCHES],
      [Opportunity, o.matched.id, OpportunityMatchStatusType.NO_MATCHES],
      [Opportunity, o.unlinked.id, OpportunityMatchStatusType.PENDING_MATCH],
      [Opportunity, o.unmatched.id, OpportunityMatchStatusType.UNMATCHED],
    ];
    for (const [entity, id, statusMatch] of stale) {
      await manager.update(entity, { id }, { statusMatch } as never);
    }

    await new BackfillStatusMatch1791198309725().up(queryRunner);
  });

  afterAll(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  const volunteerStatus = async (id: number) =>
    (await queryRunner.manager.findOneByOrFail(Volunteer, { id })).statusMatch;
  const opportunityStatus = async (id: number) =>
    (await queryRunner.manager.findOneByOrFail(Opportunity, { id }))
      .statusMatch;

  it("sets pending-match for a volunteer with only pending links", async () => {
    expect(await volunteerStatus(v.pending.id)).toBe(
      VolunteerStateMatchType.PENDING_MATCH,
    );
  });

  it("sets needs-rematch for a previously engaged unlinked volunteer", async () => {
    expect(await volunteerStatus(v.unlinked.id)).toBe(
      VolunteerStateMatchType.NEEDS_REMATCH,
    );
  });

  it("leaves vol-past alone", async () => {
    expect(await volunteerStatus(v.past.id)).toBe(VolunteerStateMatchType.PAST);
  });

  it("keeps no-matches for a never-engaged unlinked volunteer", async () => {
    expect(await volunteerStatus(v.untouched.id)).toBe(
      VolunteerStateMatchType.NO_MATCHES,
    );
  });

  it("sets matched for an opportunity with a matched link", async () => {
    expect(await opportunityStatus(o.matched.id)).toBe(
      OpportunityMatchStatusType.MATCHED,
    );
  });

  it("sets needs-rematch for a previously engaged unlinked opportunity", async () => {
    expect(await opportunityStatus(o.unlinked.id)).toBe(
      OpportunityMatchStatusType.NEEDS_REMATCH,
    );
  });

  it("leaves opp-vol-unmatched alone", async () => {
    expect(await opportunityStatus(o.unmatched.id)).toBe(
      OpportunityMatchStatusType.UNMATCHED,
    );
  });
});
