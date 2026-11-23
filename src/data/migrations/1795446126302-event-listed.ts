import { MigrationInterface, QueryRunner } from "typeorm";

export class EventListed1795446126302 implements MigrationInterface {
  name = "EventListed1795446126302";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d" ADD "is_listed" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_n4d" DROP COLUMN "is_listed"`);
  }
}
