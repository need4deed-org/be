import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDistrictToOpp1778069345200 implements MigrationInterface {
  name = "AddDistrictToOpp1778069345200";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "district_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_20c491a989b6d30143c9487fa3c" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_20c491a989b6d30143c9487fa3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "district_id"`,
    );
  }
}
