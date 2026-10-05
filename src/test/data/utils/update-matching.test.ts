import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { QueryRunner } from "typeorm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import { randomNumericSuffix } from "../../random";
import {
  createOpportunity,
  createVolunteer,
  deleteFixtures,
} from "../match-fixtures";

// be#1106 review. Inside a transaction a failed save has already aborted it in
// Postgres; swallowing the error would let the caller's COMMIT silently roll
// back, so it must propagate. Outside one it's logged, as before. The save is
// made to fail with a lock timeout: another connection holds the row.
describe("update*Matching save failures", () => {
  const suffix = randomNumericSuffix();
  const volunteers: Volunteer[] = [];
  const opportunities: Opportunity[] = [];
  let holder: QueryRunner;
  let caller: QueryRunner;

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    const manager = dataSource.manager;
    volunteers.push(await createVolunteer(manager));
    opportunities.push(await createOpportunity(manager, `Failing ${suffix}`));
    await manager.save(
      new OpportunityVolunteer({
        volunteerId: volunteers[0].id,
        opportunityId: opportunities[0].id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
    // Stale, so the recompute has something to save.
    await manager.update(
      Volunteer,
      { id: volunteers[0].id },
      { statusMatch: VolunteerStateMatchType.NO_MATCHES },
    );
    await manager.update(
      Opportunity,
      { id: opportunities[0].id },
      { statusMatch: OpportunityMatchStatusType.NO_MATCHES },
    );
  });

  afterEach(async () => {
    for (const runner of [caller, holder]) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      await runner.release();
    }
  });

  afterAll(async () => {
    await deleteFixtures(dataSource.manager, volunteers, opportunities);
  });

  const holdRow = async (table: "volunteer" | "opportunity", id: number) => {
    holder = dataSource.createQueryRunner();
    await holder.connect();
    await holder.startTransaction();
    await holder.query(`SELECT id FROM ${table} WHERE id = $1 FOR UPDATE`, [
      id,
    ]);
    caller = dataSource.createQueryRunner();
    await caller.connect();
  };

  const cases = [
    {
      name: "volunteer",
      table: "volunteer" as const,
      id: () => volunteers[0].id,
      update: updateVolunteerMatching,
      statusMatch: async (id: number) =>
        (await dataSource.manager.findOneByOrFail(Volunteer, { id }))
          .statusMatch,
      stale: VolunteerStateMatchType.NO_MATCHES,
    },
    {
      name: "opportunity",
      table: "opportunity" as const,
      id: () => opportunities[0].id,
      update: updateOpportunityMatching,
      statusMatch: async (id: number) =>
        (await dataSource.manager.findOneByOrFail(Opportunity, { id }))
          .statusMatch,
      stale: OpportunityMatchStatusType.NO_MATCHES,
    },
  ];

  for (const { name, table, id, update, statusMatch, stale } of cases) {
    it(`rethrows a failed ${name} save inside a transaction`, async () => {
      await holdRow(table, id());
      await caller.startTransaction();
      await caller.query("SET LOCAL lock_timeout = '100ms'");

      await expect(update(id(), caller.manager)).rejects.toThrow(
        /lock timeout/,
      );
    });

    it(`logs a failed ${name} save outside a transaction`, async () => {
      await holdRow(table, id());
      await caller.query("SET lock_timeout = '100ms'");
      try {
        await expect(update(id(), caller.manager)).resolves.toBeUndefined();
      } finally {
        await caller.query("RESET lock_timeout");
      }
      expect(await statusMatch(id())).toBe(stale);
    });
  }
});
