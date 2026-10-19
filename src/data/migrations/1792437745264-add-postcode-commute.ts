import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostcodeCommute1792437745264 implements MigrationInterface {
  name = "AddPostcodeCommute1792437745264";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "postcode_commute" ("from_postcode_id" integer NOT NULL, "to_postcode_id" integer NOT NULL, "minutes" integer NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2d570611057f5454c773f7440da" PRIMARY KEY ("from_postcode_id", "to_postcode_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17155d439410e4688e0dad9493" ON "postcode_commute" ("to_postcode_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "postcode_commute" ADD CONSTRAINT "FK_c3096f7d6f2db71f3ffd2fda2e5" FOREIGN KEY ("from_postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "postcode_commute" ADD CONSTRAINT "FK_17155d439410e4688e0dad94936" FOREIGN KEY ("to_postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "postcode_commute" DROP CONSTRAINT "FK_17155d439410e4688e0dad94936"`,
    );
    await queryRunner.query(
      `ALTER TABLE "postcode_commute" DROP CONSTRAINT "FK_c3096f7d6f2db71f3ffd2fda2e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17155d439410e4688e0dad9493"`,
    );
    await queryRunner.query(`DROP TABLE "postcode_commute"`);
  }
}
