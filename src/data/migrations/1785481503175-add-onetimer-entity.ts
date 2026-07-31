import { MigrationInterface, QueryRunner } from "typeorm";

// Backfills the new `onetimer` table from the two places a single-occurrence
// start date/time is stored today:
//  - `accompanying.date`, for ACCOMPANYING-type opportunities
//  - the one-off `timeslot` linked via `deal_timeslot` (no end/rrule/occasional),
//    for EVENTS-type opportunities (see dto-opportunity.ts's former heuristic)
// See be#746. `accompanying.date` itself is dropped in a later migration,
// once application code no longer reads/writes it.
export class AddOnetimerEntity1785481503175 implements MigrationInterface {
  name = "AddOnetimerEntity1785481503175";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "onetimer" ("id" SERIAL NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_b8eaa44fc91a9cdc55406ef8701" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "onetimer_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_9ca1ae76540d50eba7156eceaa2" FOREIGN KEY ("onetimer_id") REFERENCES "onetimer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE TEMP TABLE "tmp_onetimer_backfill" (
        "tmp_id" SERIAL PRIMARY KEY,
        "opportunity_id" integer NOT NULL,
        "date" TIMESTAMP WITH TIME ZONE NOT NULL
      ) ON COMMIT DROP
    `);

    await queryRunner.query(`
      INSERT INTO "tmp_onetimer_backfill" ("opportunity_id", "date")
      SELECT o."id", a."date"
      FROM "opportunity" o
      JOIN "accompanying" a ON a."id" = o."accompanying_id"
      WHERE o."type" = 'accompanying' AND a."date" IS NOT NULL
    `);

    // EVENTS-type opportunities may hold their date in the one-off timeslot
    // (set by the patch handler) and/or in the blanked-out "accompanying" row
    // (set by the create handler — a pre-existing gap where create never
    // wrote a timeslot). Prefer the timeslot when both are present.
    await queryRunner.query(`
      INSERT INTO "tmp_onetimer_backfill" ("opportunity_id", "date")
      SELECT o."id", COALESCE(ts."start", a."date")
      FROM "opportunity" o
      LEFT JOIN "accompanying" a ON a."id" = o."accompanying_id"
      LEFT JOIN LATERAL (
        SELECT t."start"
        FROM "deal_timeslot" dt
        JOIN "timeslot" t ON t."id" = dt."timeslot_id"
        WHERE dt."deal_id" = o."deal_id"
          AND t."start" IS NOT NULL
          AND t."end" IS NULL
          AND t."rrule" IS NULL
          AND t."occasional" IS NULL
        ORDER BY t."id"
        LIMIT 1
      ) ts ON true
      WHERE o."type" = 'events' AND COALESCE(ts."start", a."date") IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "onetimer" ("id", "date")
      SELECT "tmp_id", "date" FROM "tmp_onetimer_backfill" ORDER BY "tmp_id"
    `);
    await queryRunner.query(`
      SELECT setval('onetimer_id_seq', (SELECT COALESCE(MAX("id"), 0) FROM "onetimer"))
    `);

    await queryRunner.query(`
      UPDATE "opportunity" o
      SET "onetimer_id" = tb."tmp_id"
      FROM "tmp_onetimer_backfill" tb
      WHERE o."id" = tb."opportunity_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_9ca1ae76540d50eba7156eceaa2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "onetimer_id"`,
    );
    await queryRunner.query(`DROP TABLE "onetimer"`);
  }
}
