import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds an explicit delivery `status` to appreciation rows so it no longer
 * has to be inferred from which date is set. Existing rows are backfilled:
 * `date_delivery` set -> 'appr-received', otherwise -> 'appr-pending'.
 * (The new 'appr-post' value has no prior data to derive from.)
 */
export class AddStatusToAppreciation1787735192446
  implements MigrationInterface
{
  name = "AddStatusToAppreciation1787735192446";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."appreciation_status_enum" AS ENUM('appr-received', 'appr-pending', 'appr-post')`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD "status" "public"."appreciation_status_enum"`,
    );
    await queryRunner.query(`
      UPDATE "appreciation"
      SET "status" = CASE
        WHEN "date_delivery" IS NOT NULL THEN 'appr-received'
        ELSE 'appr-pending'
      END::"public"."appreciation_status_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "status" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appreciation" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."appreciation_status_enum"`);
  }
}
