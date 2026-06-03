import { MigrationInterface, QueryRunner } from "typeorm";

export class FlattenDealLanguageDropProfile1780492917105
  implements MigrationInterface
{
  name = "FlattenDealLanguageDropProfile1780492917105";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the Deal<->Language m2m (mirrors profile_language, incl. enums).
    await queryRunner.query(
      `CREATE TYPE "public"."deal_language_proficiency_enum" AS ENUM('intermediate', 'fluent', 'native', 'advanced', 'beginner')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."deal_language_purpose_enum" AS ENUM('general', 'translation', 'recipient')`,
    );
    await queryRunner.query(
      `CREATE TABLE "deal_language" ("id" SERIAL NOT NULL, "proficiency" "public"."deal_language_proficiency_enum" DEFAULT 'advanced', "purpose" "public"."deal_language_purpose_enum" DEFAULT 'general', "deal_id" integer NOT NULL, "language_id" integer NOT NULL, CONSTRAINT "PK_f41aff0608b977c9b2a70e484ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_language" ADD CONSTRAINT "FK_f65d3334e061a3490b70b0b4eb9" FOREIGN KEY ("deal_id") REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_language" ADD CONSTRAINT "FK_9e1f3159d0361d8f7131f3db643" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 2. Move Profile's scalar fields onto Deal.
    await queryRunner.query(`ALTER TABLE "deal" ADD "info" character varying`);
    await queryRunner.query(`ALTER TABLE "deal" ADD "category_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_2e866113f33c2e1a3f9d81a4133" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // 3. Backfill from the soon-to-be-dropped Profile graph (must run before
    //    deal.profile_id is dropped). Enum columns are cast via text since the
    //    deal_language enum types are distinct from the profile_language ones.
    await queryRunner.query(
      `INSERT INTO "deal_language" ("deal_id", "language_id", "proficiency", "purpose") SELECT "deal"."id", "profile_language"."language_id", "profile_language"."proficiency"::text::"public"."deal_language_proficiency_enum", "profile_language"."purpose"::text::"public"."deal_language_purpose_enum" FROM "profile_language" INNER JOIN "deal" ON "deal"."profile_id" = "profile_language"."profile_id"`,
    );
    await queryRunner.query(
      `UPDATE "deal" SET "info" = "profile"."info", "category_id" = "profile"."category_id" FROM "profile" WHERE "deal"."profile_id" = "profile"."id"`,
    );

    // 4. Drop the Deal->Profile link and the Profile graph entirely.
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_9f36d6cf04687b811690d82a3c1"`,
    );
    await queryRunner.query(`ALTER TABLE "deal" DROP COLUMN "profile_id"`);
    await queryRunner.query(`DROP TABLE "profile_activity"`);
    await queryRunner.query(`DROP TABLE "profile_skill"`);
    await queryRunner.query(`DROP TABLE "profile_language"`);
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(
      `DROP TYPE "public"."profile_language_proficiency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."profile_language_purpose_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Structural restore only — data that lived in the profile graph is not
    // recovered (it was migrated onto the deal).
    await queryRunner.query(
      `CREATE TYPE "public"."profile_language_proficiency_enum" AS ENUM('beginner', 'intermediate', 'advanced', 'fluent', 'native')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_language_purpose_enum" AS ENUM('general', 'translation', 'recipient')`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile" ("id" SERIAL NOT NULL, "info" character varying, "category_id" integer, CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_49ea3bc2c466d5b457352c8a9b1" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_activity" ("id" SERIAL NOT NULL, "profile_id" integer NOT NULL, "activity_id" integer NOT NULL, CONSTRAINT "PK_8433b160087402e98a26f61c1b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" ADD CONSTRAINT "FK_24c6818a8464f28891481760531" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_activity" ADD CONSTRAINT "FK_850d7554542cf85eee1f9aee1fa" FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_skill" ("id" SERIAL NOT NULL, "profile_id" integer NOT NULL, "skill_id" integer NOT NULL, CONSTRAINT "PK_7703bcb3f88131f9b11bfee8554" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" ADD CONSTRAINT "FK_dc3b7860ffbacd6dfcffbae9b06" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_skill" ADD CONSTRAINT "FK_0010601b9bf612cda40aae1ed5f" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_language" ("id" SERIAL NOT NULL, "proficiency" "public"."profile_language_proficiency_enum" DEFAULT 'advanced', "purpose" "public"."profile_language_purpose_enum" DEFAULT 'general', "profile_id" integer NOT NULL, "language_id" integer NOT NULL, CONSTRAINT "PK_a5e5b2402dffa65cf72af5925d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" ADD CONSTRAINT "FK_2115a7ecd80ab0e1c36565f87fd" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" ADD CONSTRAINT "FK_9b9cfa82b0245720d200c4b3bb5" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Restore deal.profile_id and drop the flattened columns / table.
    await queryRunner.query(`ALTER TABLE "deal" ADD "profile_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "deal" ADD CONSTRAINT "FK_9f36d6cf04687b811690d82a3c1" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal" DROP CONSTRAINT "FK_2e866113f33c2e1a3f9d81a4133"`,
    );
    await queryRunner.query(`ALTER TABLE "deal" DROP COLUMN "category_id"`);
    await queryRunner.query(`ALTER TABLE "deal" DROP COLUMN "info"`);
    await queryRunner.query(
      `ALTER TABLE "deal_language" DROP CONSTRAINT "FK_9e1f3159d0361d8f7131f3db643"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_language" DROP CONSTRAINT "FK_f65d3334e061a3490b70b0b4eb9"`,
    );
    await queryRunner.query(`DROP TABLE "deal_language"`);
    await queryRunner.query(`DROP TYPE "public"."deal_language_purpose_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."deal_language_proficiency_enum"`,
    );
  }
}
