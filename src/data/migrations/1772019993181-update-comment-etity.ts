import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCommentEtity1772019993181 implements MigrationInterface {
  name = "UpdateCommentEtity1772019993181";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."field_translation_entity_type_enum" RENAME TO "field_translation_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" TYPE "public"."field_translation_entity_type_enum" USING "entity_type"::"text"::"public"."field_translation_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum" RENAME TO "option_item_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."option_item_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "option" ALTER COLUMN "item_type" TYPE "public"."option_item_type_enum" USING "item_type"::"text"::"public"."option_item_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum_old"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_source_entity_type_enum" RENAME TO "timeline_source_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_source_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "source_entity_type" TYPE "public"."timeline_source_entity_type_enum" USING "source_entity_type"::"text"::"public"."timeline_source_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_source_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_target_entity_type_enum" RENAME TO "timeline_target_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_target_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "target_entity_type" TYPE "public"."timeline_target_entity_type_enum" USING "target_entity_type"::"text"::"public"."timeline_target_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_target_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_content_entity_type_enum" RENAME TO "timeline_content_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "content_entity_type" TYPE "public"."timeline_content_entity_type_enum" USING "content_entity_type"::"text"::"public"."timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_content_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum" RENAME TO "comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer', 'opportunity')`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" TYPE "public"."comment_entity_type_enum" USING "entity_type"::"text"::"public"."comment_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON "field_translation" ("language_id", "entity_type", "entity_id", "field_name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_type", "target_entity_id", "timestamp") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("entity_type", "entity_id", "language_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" TYPE "public"."comment_entity_type_enum_old" USING "entity_type"::"text"::"public"."comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(`DROP TYPE "public"."comment_entity_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum_old" RENAME TO "comment_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("entity_id", "entity_type", "language_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "content_entity_type" TYPE "public"."timeline_content_entity_type_enum_old" USING "content_entity_type"::"text"::"public"."timeline_content_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_content_entity_type_enum_old" RENAME TO "timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_target_entity_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "target_entity_type" TYPE "public"."timeline_target_entity_type_enum_old" USING "target_entity_type"::"text"::"public"."timeline_target_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_target_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_target_entity_type_enum_old" RENAME TO "timeline_target_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_source_entity_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "source_entity_type" TYPE "public"."timeline_source_entity_type_enum_old" USING "source_entity_type"::"text"::"public"."timeline_source_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_source_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."timeline_source_entity_type_enum_old" RENAME TO "timeline_source_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_id", "target_entity_type", "timestamp") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."option_item_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "option" ALTER COLUMN "item_type" TYPE "public"."option_item_type_enum_old" USING "item_type"::"text"::"public"."option_item_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum_old" RENAME TO "option_item_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum_old" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" TYPE "public"."field_translation_entity_type_enum_old" USING "entity_type"::"text"::"public"."field_translation_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."field_translation_entity_type_enum_old" RENAME TO "field_translation_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON "field_translation" ("entity_id", "entity_type", "field_name", "language_id") `,
    );
  }
}
