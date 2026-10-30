import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentUnclaimedEngagementStatusIndex1793367140648
  implements MigrationInterface
{
  name = "AddAgentUnclaimedEngagementStatusIndex1793367140648";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_8bc1a6e502de0571517426ffb3" ON "agent" ("unclaimed", "engagement_status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bc1a6e502de0571517426ffb3"`,
    );
  }
}
