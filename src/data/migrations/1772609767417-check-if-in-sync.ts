import { MigrationInterface, QueryRunner } from "typeorm";

export class CheckIfInSync1772609767417 implements MigrationInterface {
  name = "CheckIfInSync1772609767417";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT '{mobilePhone}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "preferred_communication_type" SET DEFAULT '{mobilePhone}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "preferred_communication_type" SET DEFAULT '{mobilePhone}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
  }
}
