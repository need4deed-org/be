import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCityToAddressEntity1765976202270 implements MigrationInterface {
  name = "AddCityToAddressEntity1765976202270";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "address" ADD "city" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "address" DROP COLUMN "city"`);
  }
}
