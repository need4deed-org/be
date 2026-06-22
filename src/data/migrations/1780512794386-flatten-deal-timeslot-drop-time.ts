import { MigrationInterface, QueryRunner } from "typeorm";

export class FlattenDealTimeslotDropTime1780512794386
  implements MigrationInterface
{
  name = "FlattenDealTimeslotDropTime1780512794386";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the Deal<->Timeslot m2m (with the unique constraint).
    await queryRunner.query(
      `CREATE TABLE "deal_timeslot" ("id" SERIAL NOT NULL, "deal_id" integer NOT NULL, "timeslot_id" integer NOT NULL, CONSTRAINT "UQ_dc6a725ff9fddeff3866465fc95" UNIQUE ("deal_id", "timeslot_id"), CONSTRAINT "PK_4259966a4f5f9cc66b7179d94e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_timeslot" ADD CONSTRAINT "FK_b8ec1df4dc435355a2863782b81" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_timeslot" ADD CONSTRAINT "FK_8a6ceb170e7eb33cadfa425a455" FOREIGN KEY ("timeslot_id") REFERENCES "timeslot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 2. Backfill from the soon-to-be-dropped Time graph, mapping
    //    time_id -> deal_id through the deal table. DISTINCT guards the
    //    (deal_id, timeslot_id) unique constraint against duplicate source rows.
    await queryRunner.query(
      `INSERT INTO "deal_timeslot" ("deal_id", "timeslot_id") SELECT DISTINCT "deal"."id", "time_timeslot"."timeslot_id" FROM "time_timeslot" INNER JOIN "deal" ON "deal"."time_id" = "time_timeslot"."time_id"`,
    );

    // 3. Drop the Deal->Time link and the Time graph. Time.info is unused
    //    (never read/written by the app), so it is not rehomed.
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_cefd2ee093f33d43794ebf5ed07"`,
    );
    await queryRunner.query(`ALTER TABLE "deal" DROP COLUMN "time_id"`);
    await queryRunner.query(`DROP TABLE "time_timeslot"`);
    await queryRunner.query(`DROP TABLE "time"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Structural restore only — the dropped Time/TimeTimeslot data is not
    // recovered (it was migrated onto the deal via deal_timeslot).
    await queryRunner.query(
      `CREATE TABLE "time" ("id" SERIAL NOT NULL, "info" character varying, CONSTRAINT "PK_9ec81ea937e5d405c33a9f49251" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_timeslot" ("id" SERIAL NOT NULL, "time_id" integer NOT NULL, "timeslot_id" integer NOT NULL, CONSTRAINT "PK_5b5d0d8fb34e9de7849a058ad08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" ADD CONSTRAINT "FK_42f12245378cdfc151d3af2189d" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "time_timeslot" ADD CONSTRAINT "FK_44cb00266b6e97b935c34c50686" FOREIGN KEY ("timeslot_id") REFERENCES "timeslot"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Restore deal.time_id (nullable — the table is already populated) and
    // drop the flattened m2m.
    await queryRunner.query(`ALTER TABLE "deal" ADD "time_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_cefd2ee093f33d43794ebf5ed07" FOREIGN KEY ("time_id") REFERENCES "time"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_timeslot" DROP CONSTRAINT "FK_8a6ceb170e7eb33cadfa425a455"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_timeslot" DROP CONSTRAINT "FK_b8ec1df4dc435355a2863782b81"`,
    );
    await queryRunner.query(`DROP TABLE "deal_timeslot"`);
  }
}
