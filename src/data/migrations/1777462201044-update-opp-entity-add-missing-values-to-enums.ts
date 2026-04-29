import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOppEntityAddMissingValuesToEnums1777462201044
  implements MigrationInterface
{
  name = "UpdateOppEntityAddMissingValuesToEnums1777462201044";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_match_enum" AS ENUM('opp-vol-pending-match', 'opp-vol-no-matches', 'opp-vol-matched', 'opp-vol-needs-rematch', 'opp-vol-unmatched', 'opp-vol-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "status_match" "public"."opportunity_status_match_enum" NOT NULL DEFAULT 'opp-vol-no-matches'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_match_enum" RENAME TO "volunteer_status_match_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_match_enum" AS ENUM('vol-no-matches', 'vol-pending-match', 'vol-matched', 'vol-needs-rematch', 'vol-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" TYPE "public"."volunteer_status_match_enum" USING "status_match"::"text"::"public"."volunteer_status_match_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET DEFAULT 'vol-no-matches'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_match_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_match_enum_old" AS ENUM('vol-no-matches', 'vol-pending-match', 'vol-matched', 'vol-needs-rematch')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" TYPE "public"."volunteer_status_match_enum_old" USING "status_match"::"text"::"public"."volunteer_status_match_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET DEFAULT 'vol-no-matches'`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_match_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_match_enum_old" RENAME TO "volunteer_status_match_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "status_match"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_status_match_enum"`,
    );
  }
}
