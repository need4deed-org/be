import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealDistrict1780515101270 implements MigrationInterface {
  name = "AddDealDistrict1780515101270";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deal_district" ("id" SERIAL NOT NULL, "deal_id" integer NOT NULL, "district_id" integer NOT NULL, CONSTRAINT "UQ_bb2d0e17996f1cc2e8c36b8097c" UNIQUE ("deal_id", "district_id"), CONSTRAINT "PK_f166ddb3884b15af861573d036b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_district" ADD CONSTRAINT "FK_b9f762e06a46859f822e66e11d1" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_district" ADD CONSTRAINT "FK_56838b99011fdc67a0b38169026" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Backfill: copy existing Location<->District rows onto the Deal directly,
    // mapping location_id -> deal_id through the deal table. DISTINCT guards
    // the (deal_id, district_id) unique constraint against duplicate source rows.
    // (The now-unused location_district table is dropped with Location in #618.)
    await queryRunner.query(
      `INSERT INTO "deal_district" ("deal_id", "district_id") SELECT DISTINCT "deal"."id", "location_district"."district_id" FROM "location_district" INNER JOIN "deal" ON "deal"."location_id" = "location_district"."location_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deal_district" DROP CONSTRAINT "FK_56838b99011fdc67a0b38169026"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_district" DROP CONSTRAINT "FK_b9f762e06a46859f822e66e11d1"`,
    );
    await queryRunner.query(`DROP TABLE "deal_district"`);
  }
}
