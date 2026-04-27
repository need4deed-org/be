import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOppStatusMatch1777284196924 implements MigrationInterface {
  name = "AddOppStatusMatch1777284196924";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_match_enum" ADD VALUE IF NOT EXISTS 'vol-past'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD COLUMN IF NOT EXISTS "status_match" "volunteer_status_match_enum" NOT NULL DEFAULT 'vol-no-matches'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN IF EXISTS "status_match"`,
    );
    // PostgreSQL does not support removing enum values; vol-past remains in volunteer_status_match_enum.
  }
}
