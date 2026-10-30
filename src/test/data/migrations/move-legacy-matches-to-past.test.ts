import {
  OpportunityMatchStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  applyLegacyMatchChanges,
  LegacyMatchChange,
  revertLegacyMatchChanges,
} from "../../../data/utils/legacy-match-changes";
import { randomNumericSuffix } from "../../random";
import { createOpportunity, createVolunteer } from "../match-fixtures";

const { PENDING, MATCHED, PAST } = OpportunityVolunteerStatusType;

describe("MoveLegacyMatchesToPast migration", () => {
  const suffix = randomNumericSuffix();
  let queryRunner: QueryRunner;
  let volunteer: Volunteer;
  let regular: Opportunity;
  let accompanying: Opportunity;
  let dated: Opportunity;
  let mismatched: Opportunity;
  let changes: LegacyMatchChange[];
  let result: { changed: number; skipped: string[] };

  const volunteerCreated = new Date("2024-03-01T10:00:00Z");
  const regularCreated = new Date("2024-01-15T10:00:00Z");
  const accompanyingCreated = new Date("2024-06-20T10:00:00Z");

  const link = (opportunity: Opportunity) =>
    queryRunner.manager.findOneByOrFail(OpportunityVolunteer, {
      volunteerId: volunteer.id,
      opportunityId: opportunity.id,
    });

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;

    volunteer = await createVolunteer(manager);
    regular = await createOpportunity(manager, `Legacy regular ${suffix}`);
    accompanying = await manager.save(
      new Opportunity({
        title: `Legacy accompanying ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
      }),
    );
    dated = await createOpportunity(manager, `Legacy dated ${suffix}`);
    mismatched = await createOpportunity(manager, `Legacy mismatch ${suffix}`);

    await manager.query(`UPDATE volunteer SET created_at = $2 WHERE id = $1`, [
      volunteer.id,
      volunteerCreated,
    ]);
    for (const [opportunity, createdAt] of [
      [regular, regularCreated],
      [accompanying, accompanyingCreated],
    ] as const) {
      await manager.query(
        `UPDATE opportunity SET created_at = $2 WHERE id = $1`,
        [opportunity.id, createdAt],
      );
    }

    const links: [Opportunity, OpportunityVolunteerStatusType][] = [
      [regular, PENDING],
      [accompanying, MATCHED],
      [dated, PENDING],
      [mismatched, MATCHED],
    ];
    for (const [opportunity, status] of links) {
      await manager.save(
        new OpportunityVolunteer({
          volunteerId: volunteer.id,
          opportunityId: opportunity.id,
          status,
        }),
      );
    }

    changes = [
      [volunteer.id, regular.id, PENDING, PAST],
      [volunteer.id, accompanying.id, MATCHED, PAST],
      [volunteer.id, dated.id, PENDING, MATCHED, "2024-08-16"],
      [volunteer.id, mismatched.id, PENDING, PAST],
      [volunteer.id, 0, PENDING, PAST],
    ];
    result = await applyLegacyMatchChanges(queryRunner, changes);
  });

  afterAll(async () => {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  });

  it("moves pending to past dated by whichever side arrived last", async () => {
    const row = await link(regular);
    expect(row.status).toBe(PAST);
    expect(row.createdAt.toISOString()).toBe(volunteerCreated.toISOString());
    expect(row.updatedAt.toISOString()).toBe(volunteerCreated.toISOString());
  });

  it("moves matched to past without dating it today", async () => {
    const row = await link(accompanying);
    expect(row.status).toBe(PAST);
    expect(row.createdAt.toISOString()).toBe(accompanyingCreated.toISOString());
    expect(row.updatedAt.toISOString()).toBe(accompanyingCreated.toISOString());
  });

  it("uses the given date for pending to matched", async () => {
    const row = await link(dated);
    expect(row.status).toBe(MATCHED);
    expect(row.createdAt.toISOString().slice(0, 10)).toBe("2024-08-16");
  });

  it("skips rows whose current status doesn't match, and missing rows", async () => {
    expect((await link(mismatched)).status).toBe(MATCHED);
    expect(result.changed).toBe(3);
    expect(result.skipped).toEqual([
      `${volunteer.id}/${mismatched.id}:${MATCHED}`,
      `${volunteer.id}/0:missing`,
    ]);
  });

  it("recomputes the opportunity match status", async () => {
    const opportunity = await queryRunner.manager.findOneByOrFail(Opportunity, {
      id: regular.id,
    });
    expect(opportunity.statusMatch).toBe(
      OpportunityMatchStatusType.NEEDS_REMATCH,
    );
  });

  it("restores the previous status on revert", async () => {
    await revertLegacyMatchChanges(queryRunner, changes);
    expect((await link(regular)).status).toBe(PENDING);
    expect((await link(accompanying)).status).toBe(MATCHED);
    expect((await link(dated)).status).toBe(PENDING);
    expect((await link(mismatched)).status).toBe(MATCHED);
  });
});
