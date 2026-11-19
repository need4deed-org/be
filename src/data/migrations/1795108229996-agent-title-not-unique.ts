import { MigrationInterface, QueryRunner } from "typeorm";

export class AgentTitleNotUnique1795108229996 implements MigrationInterface {
  name = "AgentTitleNotUnique1795108229996";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "UQ_c13f74bf3e3d5e4fedf63231881"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "UQ_c13f74bf3e3d5e4fedf63231881" UNIQUE ("title")`,
    );
  }
}
