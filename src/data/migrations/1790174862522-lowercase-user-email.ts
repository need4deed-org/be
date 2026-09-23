import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Lowercases (and trims) every User.email so the existing unique index on
 * it becomes effectively case-insensitive — new writes are normalized by
 * User.email's emailTransformer (be#1013).
 *
 * Refuses to run if two Users already differ only by email case/whitespace:
 * which account to keep is a manual decision, not something to guess here.
 * Only user ids are reported, never the emails themselves.
 */
export class LowercaseUserEmail1790174862522 implements MigrationInterface {
  name = "LowercaseUserEmail1790174862522";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: { ids: number[] }[] = await queryRunner.query(
      `SELECT array_agg(id ORDER BY id) AS ids FROM "user"
       GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1`,
    );
    if (duplicates.length > 0) {
      const groups = duplicates.map(({ ids }) => `[${ids.join(", ")}]`);
      throw new Error(
        `Users with case-variant duplicate emails must be merged manually before lowercasing User.email — user id groups: ${groups.join(" ")}`,
      );
    }

    await queryRunner.query(
      `UPDATE "user" SET email = LOWER(TRIM(email))
       WHERE email <> LOWER(TRIM(email))`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // The original casing isn't recorded anywhere — down() is a no-op.
  }
}
