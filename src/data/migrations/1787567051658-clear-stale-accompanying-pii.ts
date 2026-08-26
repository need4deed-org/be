import { MigrationInterface, QueryRunner } from "typeorm";

// be#780: an opportunity that was ever switched away from ACCOMPANYING type
// could be left with a linked "accompanying" row still holding refugee PII
// (name/phone/email/address/language) — the REGULAR-transition write path
// deletes it correctly, but the EVENTS-transition path silently stopped
// doing so when #816 (the Onetimer refactor) rewrote that block, so any
// ACCOMPANYING -> EVENTS switch made between that merge and the app-level
// fix landing could have left one behind. Mirrors the same
// temp-table-then-delete shape as the earlier
// RetireAccompanyingDate1785481623751 cleanup, generalized to any
// non-ACCOMPANYING type rather than just 'events'.
export class ClearStaleAccompanyingPii1787567051658
  implements MigrationInterface
{
  name = "ClearStaleAccompanyingPii1787567051658";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_stale_accompanying" ON COMMIT DROP AS
      SELECT o."id" AS "opportunity_id", o."accompanying_id"
      FROM "opportunity" o
      WHERE o."type" != 'accompanying' AND o."accompanying_id" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "opportunity" o
      SET "accompanying_id" = NULL
      FROM "tmp_stale_accompanying" tsa
      WHERE o."id" = tsa."opportunity_id"
    `);

    await queryRunner.query(`
      DELETE FROM "accompanying" a
      USING "tmp_stale_accompanying" tsa
      WHERE a."id" = tsa."accompanying_id"
    `);
  }

  public async down(): Promise<void> {
    // Not reversible: the deleted rows carried refugee PII that this
    // migration exists specifically to remove — restoring it on a revert
    // would defeat the purpose of the migration.
  }
}
