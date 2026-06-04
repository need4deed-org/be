import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealActivity1780485146870 implements MigrationInterface {
  name = "AddDealActivity1780485146870";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deal_activity" ("id" SERIAL NOT NULL, "deal_id" integer NOT NULL, "activity_id" integer NOT NULL, CONSTRAINT "PK_2dfd3d9d6571f3b52b4f2a2f7b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_activity" ADD CONSTRAINT "FK_c8b28c14786d76527d121126259" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_activity" ADD CONSTRAINT "FK_60a29bcf00ea63da27514e8f748" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Backfill: copy existing Profile<->Activity rows onto the Deal directly,
    // mapping profile_id -> deal_id through the deal table.
    await queryRunner.query(
      `INSERT INTO "deal_activity" ("deal_id", "activity_id") SELECT "deal"."id", "profile_activity"."activity_id" FROM "profile_activity" INNER JOIN "deal" ON "deal"."profile_id" = "profile_activity"."profile_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deal_activity" DROP CONSTRAINT "FK_60a29bcf00ea63da27514e8f748"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_activity" DROP CONSTRAINT "FK_c8b28c14786d76527d121126259"`,
    );
    await queryRunner.query(`DROP TABLE "deal_activity"`);
  }
}
