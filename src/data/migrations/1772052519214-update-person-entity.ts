import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePersonEntity1772052519214 implements MigrationInterface {
  name = "UpdatePersonEntity1772052519214";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ADD "preferred_communication_type" text array NOT NULL DEFAULT '{mobilePhone}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" DROP COLUMN "preferred_communication_type"`,
    );
  }
}
