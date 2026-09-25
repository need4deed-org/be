import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds User.deactivatedAt so a deactivated account (self-service deletion,
 * be#583, or GDPR erasure) is distinguishable from a never-verified one —
 * both have isActive = false (be#1007 review).
 */
export class AddUserDeactivatedAt1790334133274 implements MigrationInterface {
  name = "AddUserDeactivatedAt1790334133274";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "deactivated_at" TIMESTAMP`,
    );
    // Accounts already erased by erasePersonPii carry this sentinel email.
    await queryRunner.query(
      `UPDATE "user" SET "deactivated_at" = now()
       WHERE "is_active" = false AND "email" LIKE 'deleted-user-%@erased.need4deed.org'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deactivated_at"`);
  }
}
