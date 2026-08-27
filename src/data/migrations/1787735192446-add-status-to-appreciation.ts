import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds an explicit delivery `status` to appreciation rows so it no longer
 * has to be inferred from which date is set. Existing rows are backfilled:
 * `date_delivery` set -> 'appr-received', otherwise -> 'appr-pending'.
 *
 * REVIEWER SIGN-OFF: this backfill is lossy and irreversible. There was no
 * 'appr-post' concept before this migration, so any row that was really
 * "sent by post, awaiting confirmation" is indistinguishable in the existing
 * data from a plain "not yet started" row — both backfill to 'appr-pending'
 * with no way to tell them apart afterwards. `down()` cannot restore that
 * lost distinction either, since it was never recorded in the first place.
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
