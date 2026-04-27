import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNidToAgentVolOpp1776935007602 implements MigrationInterface {
  name = "AddNidToAgentVolOpp1776935007602";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "nid" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "nid" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "nid" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "nid"`);
    await queryRunner.query(`ALTER TABLE "opportunity" DROP COLUMN "nid"`);
    await queryRunner.query(`ALTER TABLE "volunteer" DROP COLUMN "nid"`);
  }
}
