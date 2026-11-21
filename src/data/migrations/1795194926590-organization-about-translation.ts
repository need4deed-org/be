import { MigrationInterface, QueryRunner } from "typeorm";

export class OrganizationAboutTranslation1795194926590
  implements MigrationInterface
{
  name = "OrganizationAboutTranslation1795194926590";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization" ADD "original_language_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "organization_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "CHK_field_translation_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "CHK_field_translation_one_target" CHECK (num_nonnulls("opportunity_id", "translated_language_id", "category_id", "activity_id", "skill_id", "agent_type_id", "service_id", "lead_from_id", "organization_id") = 1)`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum" RENAME TO "comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
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
      `ALTER TYPE "public"."notion_relation_host_type_enum" RENAME TO "notion_relation_host_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_host_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notion_relation" ALTER COLUMN "host_type" TYPE "public"."notion_relation_host_type_enum" USING "host_type"::"text"::"public"."notion_relation_host_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_host_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notion_relation_tenant_type_enum" RENAME TO "notion_relation_tenant_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_tenant_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notion_relation" ALTER COLUMN "tenant_type" TYPE "public"."notion_relation_tenant_type_enum" USING "tenant_type"::"text"::"public"."notion_relation_tenant_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_tenant_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum" RENAME TO "option_item_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."option_item_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_content_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'organization', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "content_entity_type" TYPE "public"."timeline_content_entity_type_enum" USING "content_entity_type"::"text"::"public"."timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_content_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("entity_type", "entity_id", "language_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_field_translation_organization" ON "field_translation" ("organization_id", "field_name", "language_id") WHERE "organization_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_type", "target_entity_id", "timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_c44f471f9fd9986c472523d6c98" FOREIGN KEY ("original_language_id") REFERENCES "language"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "FK_995609a425fa7a3ec2cd6cb20df" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "FK_995609a425fa7a3ec2cd6cb20df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_c44f471f9fd9986c472523d6c98"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_field_translation_organization"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."option_item_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "option" ALTER COLUMN "item_type" TYPE "public"."option_item_type_enum_old" USING "item_type"::"text"::"public"."option_item_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum_old" RENAME TO "option_item_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_tenant_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notion_relation" ALTER COLUMN "tenant_type" TYPE "public"."notion_relation_tenant_type_enum_old" USING "tenant_type"::"text"::"public"."notion_relation_tenant_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_tenant_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notion_relation_tenant_type_enum_old" RENAME TO "notion_relation_tenant_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_host_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notion_relation" ALTER COLUMN "host_type" TYPE "public"."notion_relation_host_type_enum_old" USING "host_type"::"text"::"public"."notion_relation_host_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_host_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notion_relation_host_type_enum_old" RENAME TO "notion_relation_host_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum_old" AS ENUM('activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `DELETE FROM "field_translation" WHERE "organization_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "CHK_field_translation_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "CHK_field_translation_one_target" CHECK (num_nonnulls("opportunity_id", "translated_language_id", "category_id", "activity_id", "skill_id", "agent_type_id", "service_id", "lead_from_id") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP COLUMN "original_language_id"`,
    );
  }
}
