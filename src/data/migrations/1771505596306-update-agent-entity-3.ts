import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity31771505596306 implements MigrationInterface {
  name = "UpdateAgentEntity31771505596306";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."agent_engagement_status_enum" AS ENUM('new', 'active', 'unresponsive', 'inactive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "engagement_status" "public"."agent_engagement_status_enum" NOT NULL DEFAULT 'new'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "engagement_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_engagement_status_enum"`,
    );
  }
}
