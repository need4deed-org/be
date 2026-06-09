import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealSkill1780488457577 implements MigrationInterface {
  name = "AddDealSkill1780488457577";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deal_skill" ("id" SERIAL NOT NULL, "deal_id" integer NOT NULL, "skill_id" integer NOT NULL, CONSTRAINT "UQ_cf0a989e58c03a76911ea044fa5" UNIQUE ("deal_id", "skill_id"), CONSTRAINT "PK_791b2c5c3ae4db034fef8999c35" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_skill" ADD CONSTRAINT "FK_407bd56cbfa76cc7d99fb29f01a" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_skill" ADD CONSTRAINT "FK_8d6f46ceb923a37da3891ace9ac" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Backfill: copy existing Profile<->Skill rows onto the Deal directly,
    // mapping profile_id -> deal_id through the deal table. DISTINCT guards
    // the (deal_id, skill_id) unique constraint against any duplicate source rows.
    await queryRunner.query(
      `INSERT INTO "deal_skill" ("deal_id", "skill_id") SELECT DISTINCT "deal"."id", "profile_skill"."skill_id" FROM "profile_skill" INNER JOIN "deal" ON "deal"."profile_id" = "profile_skill"."profile_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deal_skill" DROP CONSTRAINT "FK_8d6f46ceb923a37da3891ace9ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_skill" DROP CONSTRAINT "FK_407bd56cbfa76cc7d99fb29f01a"`,
    );
    await queryRunner.query(`DROP TABLE "deal_skill"`);
  }
}
