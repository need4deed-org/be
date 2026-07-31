import { MigrationInterface, QueryRunner } from "typeorm";

// Run after AddOnetimerEntity1785481503175 has backfilled `onetimer` (see
// be#746). EVENTS-type opportunities never had a real accompanying record —
// `accompanying` was only ever created for them to hold `date`, with
// `address`/`name` hardcoded to "". Now that the date lives on `onetimer`,
// those blank rows are unlinked and deleted; ACCOMPANYING-type `accompanying`
// rows are untouched apart from losing the (now-redundant) `date` column.
export class RetireAccompanyingDate1785481623751 implements MigrationInterface {
  name = "RetireAccompanyingDate1785481623751";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_events_accompanying" ON COMMIT DROP AS
      SELECT o."id" AS "opportunity_id", o."accompanying_id"
      FROM "opportunity" o
      WHERE o."type" = 'events' AND o."accompanying_id" IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "opportunity" o
      SET "accompanying_id" = NULL
      FROM "tmp_events_accompanying" tea
      WHERE o."id" = tea."opportunity_id"
    `);

    await queryRunner.query(`
      DELETE FROM "accompanying" a
      USING "tmp_events_accompanying" tea
      WHERE a."id" = tea."accompanying_id"
    `);

    await queryRunner.query(`ALTER TABLE "accompanying" DROP COLUMN "date"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accompanying" ADD "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    // The deleted EVENTS-only "accompanying" rows and their opportunity links
    // are not recreated — they carried no data beyond the blanked-out
    // placeholder fields already superseded by `onetimer`.
  }
}
