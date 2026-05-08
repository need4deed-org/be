import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveProfileAddDealM2m1778000000000 implements MigrationInterface {
  name = "RemoveProfileAddDealM2m1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety guard: abort if any profile is shared across multiple deals
    const sharedProfiles = await queryRunner.query(`
      SELECT profile_id, COUNT(*) AS deal_count
      FROM deal
      WHERE profile_id IS NOT NULL
      GROUP BY profile_id
      HAVING COUNT(*) > 1
    `);
    if (sharedProfiles.length > 0) {
      throw new Error(
        `Migration aborted: ${sharedProfiles.length} profile(s) are shared across multiple deals. ` +
        `Profile IDs: ${sharedProfiles.map((r: { profile_id: number }) => r.profile_id).join(", ")}`,
      );
    }

    // 1. Create deal_activity table
    await queryRunner.query(`
      CREATE TABLE "deal_activity" (
        "id" SERIAL NOT NULL,
        "deal_id" integer NOT NULL,
        "activity_id" integer NOT NULL,
        CONSTRAINT "PK_deal_activity" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_activity"
        ADD CONSTRAINT "FK_deal_activity_deal" FOREIGN KEY ("deal_id")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_activity"
        ADD CONSTRAINT "FK_deal_activity_activity" FOREIGN KEY ("activity_id")
          REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 2. Create deal_skill table
    await queryRunner.query(`
      CREATE TABLE "deal_skill" (
        "id" SERIAL NOT NULL,
        "deal_id" integer NOT NULL,
        "skill_id" integer NOT NULL,
        CONSTRAINT "PK_deal_skill" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_skill"
        ADD CONSTRAINT "FK_deal_skill_deal" FOREIGN KEY ("deal_id")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_skill"
        ADD CONSTRAINT "FK_deal_skill_skill" FOREIGN KEY ("skill_id")
          REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 3. Create deal_language table
    await queryRunner.query(`
      CREATE TYPE "public"."deal_language_proficiency_enum" AS ENUM('basic', 'intermediate', 'advanced', 'native')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."deal_language_purpose_enum" AS ENUM('general', 'recipient', 'translation')
    `);
    await queryRunner.query(`
      CREATE TABLE "deal_language" (
        "id" SERIAL NOT NULL,
        "proficiency" "public"."deal_language_proficiency_enum" DEFAULT 'advanced',
        "purpose" "public"."deal_language_purpose_enum" DEFAULT 'general',
        "deal_id" integer NOT NULL,
        "language_id" integer NOT NULL,
        CONSTRAINT "PK_deal_language" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_language"
        ADD CONSTRAINT "FK_deal_language_deal" FOREIGN KEY ("deal_id")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "deal_language"
        ADD CONSTRAINT "FK_deal_language_language" FOREIGN KEY ("language_id")
          REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 4. Add category_id column to deal
    await queryRunner.query(`
      ALTER TABLE "deal" ADD COLUMN "category_id" integer
    `);

    // 5. Copy data from profile_activity -> deal_activity (JOIN through deal.profile_id)
    await queryRunner.query(`
      INSERT INTO "deal_activity" ("deal_id", "activity_id")
      SELECT d.id, pa.activity_id
      FROM "deal" d
      JOIN "profile_activity" pa ON pa.profile_id = d.profile_id
      WHERE d.profile_id IS NOT NULL
    `);

    // 6. Copy data from profile_skill -> deal_skill
    await queryRunner.query(`
      INSERT INTO "deal_skill" ("deal_id", "skill_id")
      SELECT d.id, ps.skill_id
      FROM "deal" d
      JOIN "profile_skill" ps ON ps.profile_id = d.profile_id
      WHERE d.profile_id IS NOT NULL
    `);

    // 7. Copy data from profile_language -> deal_language
    await queryRunner.query(`
      INSERT INTO "deal_language" ("deal_id", "language_id", "proficiency", "purpose")
      SELECT d.id, pl.language_id, pl.proficiency::text::"public"."deal_language_proficiency_enum", pl.purpose::text::"public"."deal_language_purpose_enum"
      FROM "deal" d
      JOIN "profile_language" pl ON pl.profile_id = d.profile_id
      WHERE d.profile_id IS NOT NULL
    `);

    // 8. Copy profile.category_id -> deal.category_id
    await queryRunner.query(`
      UPDATE "deal" d
      SET category_id = p.category_id
      FROM "profile" p
      WHERE d.profile_id = p.id
        AND p.category_id IS NOT NULL
    `);

    // 9. Drop profile_activity, profile_skill, profile_language tables
    await queryRunner.query(`DROP TABLE "profile_activity"`);
    await queryRunner.query(`DROP TABLE "profile_skill"`);
    await queryRunner.query(`DROP TABLE "profile_language"`);

    // 10. Drop profile table
    await queryRunner.query(`DROP TABLE "profile"`);

    // 11. Drop profile_id column from deal
    await queryRunner.query(`
      ALTER TABLE "deal" DROP COLUMN "profile_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate profile table
    await queryRunner.query(`
      CREATE TABLE "profile" (
        "id" SERIAL NOT NULL,
        "info" character varying,
        "category_id" integer,
        CONSTRAINT "PK_profile" PRIMARY KEY ("id")
      )
    `);

    // Recreate profile_activity table
    await queryRunner.query(`
      CREATE TABLE "profile_activity" (
        "id" SERIAL NOT NULL,
        "profile_id" integer NOT NULL,
        "activity_id" integer NOT NULL,
        CONSTRAINT "PK_profile_activity" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_activity"
        ADD CONSTRAINT "FK_profile_activity_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_activity"
        ADD CONSTRAINT "FK_profile_activity_activity" FOREIGN KEY ("activity_id")
          REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Recreate profile_skill table
    await queryRunner.query(`
      CREATE TABLE "profile_skill" (
        "id" SERIAL NOT NULL,
        "profile_id" integer NOT NULL,
        "skill_id" integer NOT NULL,
        CONSTRAINT "PK_profile_skill" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_skill"
        ADD CONSTRAINT "FK_profile_skill_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_skill"
        ADD CONSTRAINT "FK_profile_skill_skill" FOREIGN KEY ("skill_id")
          REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Recreate profile_language table
    await queryRunner.query(`
      CREATE TYPE "public"."profile_language_proficiency_enum" AS ENUM('basic', 'intermediate', 'advanced', 'native')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."profile_language_purpose_enum" AS ENUM('general', 'recipient', 'translation')
    `);
    await queryRunner.query(`
      CREATE TABLE "profile_language" (
        "id" SERIAL NOT NULL,
        "proficiency" "public"."profile_language_proficiency_enum" DEFAULT 'advanced',
        "purpose" "public"."profile_language_purpose_enum" DEFAULT 'general',
        "profile_id" integer NOT NULL,
        "language_id" integer NOT NULL,
        CONSTRAINT "PK_profile_language" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_language"
        ADD CONSTRAINT "FK_profile_language_profile" FOREIGN KEY ("profile_id")
          REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "profile_language"
        ADD CONSTRAINT "FK_profile_language_language" FOREIGN KEY ("language_id")
          REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Add profile_id column back to deal
    await queryRunner.query(`
      ALTER TABLE "deal" ADD COLUMN "profile_id" integer
    `);

    // For each deal, create a new profile and populate M2M data back
    // First insert profiles from deals
    await queryRunner.query(`
      INSERT INTO "profile" ("category_id")
      SELECT d.category_id FROM "deal" d
    `);

    // Note: Full data restoration would require a mapping table.
    // This simplified down() creates profiles but cannot perfectly restore
    // the original profile_id assignments without additional bookkeeping.
    // In practice, this migration should be considered irreversible for data.

    // Remove category_id from deal
    await queryRunner.query(`
      ALTER TABLE "deal" DROP COLUMN "category_id"
    `);

    // Drop deal M2M tables
    await queryRunner.query(`DROP TABLE "deal_language"`);
    await queryRunner.query(`DROP TYPE "public"."deal_language_proficiency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."deal_language_purpose_enum"`);
    await queryRunner.query(`DROP TABLE "deal_skill"`);
    await queryRunner.query(`DROP TABLE "deal_activity"`);
  }
}
