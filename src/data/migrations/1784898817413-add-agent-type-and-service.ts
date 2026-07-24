import { MigrationInterface, QueryRunner } from "typeorm";

// Canonical seed values. The original 10 agent_type / 10 service titles are
// literals snapshotted from need4deed-sdk's AgentTypeKey/AgentServiceType
// enums (deliberately NOT imported from the SDK — an enum value can change
// with a later contract update, which would retroactively alter what this
// migration emits on a fresh replay). S/U, jobcenter, arzt, health and
// education are additional categories with no SDK enum equivalent, added
// directly as reference rows — the point of moving off a fixed enum onto a
// table is that new categories no longer require an SDK release.
const sqlSeedAgentType = `
INSERT INTO "agent_type" ("title") VALUES
  ('AE'), ('GU1'), ('GU2'), ('GU2+'), ('GU3'), ('NU'), ('ASOG'),
  ('S/U'), ('jobcenter'), ('arzt'),
  ('counseling-center'), ('tandem'), ('multiple-social-support')
ON CONFLICT ("title") DO NOTHING;
`;

const sqlSeedService = `
INSERT INTO "service" ("title") VALUES
  ('childcare'), ('welfare'), ('health'), ('consultation'), ('voluntary-support'),
  ('tandem'), ('sport'), ('tutoring'), ('refugee-accommodation'),
  ('job-coaching'), ('youth'), ('education')
ON CONFLICT ("title") DO NOTHING;
`;

const sqlBackfillAgentTypeId = `
UPDATE "agent"
SET "agent_type_id" = "agent_type"."id"
FROM "agent_type"
WHERE "agent_type"."title" = "agent"."type"::text;
`;

const sqlBackfillAgentService = `
INSERT INTO "agent_service" ("agent_id", "service_id")
SELECT DISTINCT "agent"."id", "service"."id"
FROM "agent"
CROSS JOIN LATERAL unnest("agent"."services") AS "agent_service_title"
INNER JOIN "service" ON "service"."title" = "agent_service_title"
ON CONFLICT ("agent_id", "service_id") DO NOTHING;
`;

// en/de labels below are the authoritative copy provided directly by the
// product owner (not inferred from fe's prior placeholder labels). GU2+ has
// no row of its own in that source data; per direction, it reuses GU2's
// translations with "+" appended.
const sqlSeedAgentTypeTranslations = `
INSERT INTO "field_translation" (field_name, language_id, entity_type, entity_id, translation)
SELECT
  'title'::varchar,
  lang.id,
  'agent_type'::field_translation_entity_type_enum,
  agent_type.id,
  CASE lang.iso_code WHEN 'en' THEN v.en_title ELSE v.de_title END
FROM (VALUES
  ('AE', 'Reception facility', 'Aufnahmeeinrichtung'),
  ('GU1', 'shared accommodation 1', 'Gemeinschaftsunterkunft 1'),
  ('GU2', 'shared accommodation 2', 'Gemeinschaftsunterkunft 2'),
  ('GU2+', 'shared accommodation 2+', 'Gemeinschaftsunterkunft 2+'),
  ('GU3', 'shared accommodation 3', 'Gemeinschaftsunterkunft 3'),
  ('NU', 'Emergency shelter', 'Notunterkunft'),
  ('ASOG', 'accommodation with no social support', 'ASOG'),
  ('S/U', 'School', 'Schule/Uni'),
  ('jobcenter', 'Jobcenter', 'Jobcenter'),
  ('arzt', 'Doctor', 'Arzt'),
  ('counseling-center', 'consultation center', 'Beratungsstelle'),
  ('tandem', 'Tandem', 'Tandem'),
  ('multiple-social-support', 'multiple social support', 'Mehrere Soziale Leistungen')
) AS v(key, en_title, de_title)
INNER JOIN "agent_type" ON "agent_type"."title" = v.key
CROSS JOIN "language" lang
WHERE lang.iso_code IN ('en', 'de')
ON CONFLICT (language_id, entity_type, entity_id, field_name)
DO UPDATE SET translation = EXCLUDED.translation;
`;

const sqlSeedServiceTranslations = `
INSERT INTO "field_translation" (field_name, language_id, entity_type, entity_id, translation)
SELECT
  'title'::varchar,
  lang.id,
  'service'::field_translation_entity_type_enum,
  service.id,
  CASE lang.iso_code WHEN 'en' THEN v.en_title ELSE v.de_title END
FROM (VALUES
  ('childcare', 'childcare', 'Kinderbetreuung'),
  ('welfare', 'welfare', 'Sozialhilfe'),
  ('health', 'Health', 'Gesundheit'),
  ('consultation', 'consultation', 'Beratung'),
  ('voluntary-support', 'voluntary-support', 'Freiwilligenhilfe'),
  ('tandem', 'tandem', 'Tandem'),
  ('sport', 'sport', 'Sport'),
  ('tutoring', 'tutoring', 'Nachhilfe'),
  ('refugee-accommodation', 'refugee-accommodation', 'Flüchtlingsunterkunft'),
  ('job-coaching', 'job-coaching', 'Jobcoaching'),
  ('youth', 'youth', 'Jugendarbeit'),
  ('education', 'Education', 'Bildung')
) AS v(key, en_title, de_title)
INNER JOIN "service" ON "service"."title" = v.key
CROSS JOIN "language" lang
WHERE lang.iso_code IN ('en', 'de')
ON CONFLICT (language_id, entity_type, entity_id, field_name)
DO UPDATE SET translation = EXCLUDED.translation;
`;

// Registers the new reference rows with the generic GET /option list
// registry, mirroring how the language/activity/district/skill options are
// registered (see option.seed.ts and the Dari-language fix migration).
const sqlSeedAgentTypeOptions = `
INSERT INTO "option" (item_id, item_type)
SELECT id, 'agent_type' FROM "agent_type";
`;

const sqlSeedServiceOptions = `
INSERT INTO "option" (item_id, item_type)
SELECT id, 'service' FROM "service";
`;

export class AddAgentTypeAndService1784898817413 implements MigrationInterface {
  name = "AddAgentTypeAndService1784898817413";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "service" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, CONSTRAINT "UQ_eaae4b7c4571ef8eec883d6202f" UNIQUE ("title"), CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_service" ("id" SERIAL NOT NULL, "agent_id" integer NOT NULL, "service_id" integer NOT NULL, CONSTRAINT "UQ_992b84d11cba2e453a18635d65a" UNIQUE ("agent_id", "service_id"), CONSTRAINT "PK_4b520fc463fe08f2de32b08665f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_type" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, CONSTRAINT "UQ_e52c57e06e685a88b774e3ed0e1" UNIQUE ("title"), CONSTRAINT "PK_f05cf3538bfe43d6d25dc2181d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "agent_type_id" integer`);

    // The enum-extension dance below (rename old type, create new type with
    // agent_type/service added, swap columns over, drop old type) must run
    // BEFORE any INSERT casts to 'agent_type'/'service' — those values don't
    // exist on field_translation_entity_type_enum/option_item_type_enum yet.
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum" RENAME TO "comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."field_translation_entity_type_enum" RENAME TO "field_translation_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `ALTER TYPE "public"."notion_relation_host_type_enum" RENAME TO "notion_relation_host_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_host_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."notion_relation_tenant_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."option_item_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_content_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'agent_type', 'category', 'comment', 'district', 'language', 'lead_from', 'opportunity', 'service', 'skill', 'volunteer')`,
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
      `CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON "field_translation" ("language_id", "entity_type", "entity_id", "field_name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_type", "target_entity_id", "timestamp") `,
    );

    // Seed the new reference tables + their translations + option-list
    // registrations, then backfill from the old columns, before dropping them.
    await queryRunner.query(sqlSeedAgentType);
    await queryRunner.query(sqlSeedService);
    await queryRunner.query(sqlBackfillAgentTypeId);
    await queryRunner.query(sqlBackfillAgentService);
    await queryRunner.query(sqlSeedAgentTypeTranslations);
    await queryRunner.query(sqlSeedServiceTranslations);
    await queryRunner.query(sqlSeedAgentTypeOptions);
    await queryRunner.query(sqlSeedServiceOptions);

    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "services"`);

    await queryRunner.query(
      `ALTER TABLE "agent_service" ADD CONSTRAINT "FK_151637a73a1caff857a7b6205e6" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_service" ADD CONSTRAINT "FK_6369b438fbff3adbac7b0829853" FOREIGN KEY ("service_id") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_1124c67ba0232c41780f387ca30" FOREIGN KEY ("agent_type_id") REFERENCES "agent_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_1124c67ba0232c41780f387ca30"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_service" DROP CONSTRAINT "FK_6369b438fbff3adbac7b0829853"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_service" DROP CONSTRAINT "FK_151637a73a1caff857a7b6205e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."option_item_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "option" ALTER COLUMN "item_type" TYPE "public"."option_item_type_enum_old" USING "item_type"::"text"::"public"."option_item_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum_old" RENAME TO "option_item_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_tenant_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."notion_relation_host_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."field_translation_entity_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum_old" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "agent_type_id"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "services" text array`);
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum" AS ENUM('AE', 'GU1', 'GU2', 'GU2+', 'GU3', 'NU', 'ASOG', 'counseling-center', 'tandem', 'multiple-social-support')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "type" "public"."agent_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "agent_type"`);
    await queryRunner.query(`DROP TABLE "agent_service"`);
    await queryRunner.query(`DROP TABLE "service"`);
  }
}
