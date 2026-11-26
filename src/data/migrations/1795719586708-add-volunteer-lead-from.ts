import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerLeadFrom1795719586708 implements MigrationInterface {
  name = "AddVolunteerLeadFrom1795719586708";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "volunteer_lead_from" ("volunteer_id" integer NOT NULL, "lead_from_id" integer NOT NULL, "statistics_event_id" integer, CONSTRAINT "UQ_7888a45f46398c0171b0f1ab0cf" UNIQUE ("statistics_event_id"), CONSTRAINT "PK_e30f859b7e92a1d067a93e6840d" PRIMARY KEY ("volunteer_id", "lead_from_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c435290f1366b67e6af70bf8d" ON "volunteer_lead_from" ("lead_from_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" ADD CONSTRAINT "FK_6fdedf5875945337a26d37d4a85" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" ADD CONSTRAINT "FK_3c435290f1366b67e6af70bf8df" FOREIGN KEY ("lead_from_id") REFERENCES "lead_from"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" ADD CONSTRAINT "FK_7888a45f46398c0171b0f1ab0cf" FOREIGN KEY ("statistics_event_id") REFERENCES "statistics_event"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" DROP CONSTRAINT "FK_7888a45f46398c0171b0f1ab0cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" DROP CONSTRAINT "FK_3c435290f1366b67e6af70bf8df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_lead_from" DROP CONSTRAINT "FK_6fdedf5875945337a26d37d4a85"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c435290f1366b67e6af70bf8d"`,
    );
    await queryRunner.query(`DROP TABLE "volunteer_lead_from"`);
  }
}
