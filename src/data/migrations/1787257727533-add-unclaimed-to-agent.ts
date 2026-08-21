import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnclaimedToAgent1787257727533 implements MigrationInterface {
  name = "AddUnclaimedToAgent1787257727533";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "unclaimed" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "unclaimed"`);
  }
}
