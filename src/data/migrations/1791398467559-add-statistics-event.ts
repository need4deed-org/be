import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatisticsEvent1791398467559 implements MigrationInterface {
  name = "AddStatisticsEvent1791398467559";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "statistics_event" ("id" SERIAL NOT NULL, "metric" character varying NOT NULL, "occurred_at" TIMESTAMP NOT NULL DEFAULT now(), "value_key" character varying NOT NULL, "district_id" integer, "opportunity_type" character varying, CONSTRAINT "PK_ef9ffbaa7dee5bf6c0cafdb9901" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b82dec29c85503d2b29510577" ON "statistics_event" ("district_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52bf6f0aa59d53b3e7a025b0d9" ON "statistics_event" ("metric", "occurred_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "statistics_event" ADD CONSTRAINT "FK_2b82dec29c85503d2b295105770" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "statistics_event" DROP CONSTRAINT "FK_2b82dec29c85503d2b295105770"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_52bf6f0aa59d53b3e7a025b0d9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b82dec29c85503d2b29510577"`,
    );
    await queryRunner.query(`DROP TABLE "statistics_event"`);
  }
}
