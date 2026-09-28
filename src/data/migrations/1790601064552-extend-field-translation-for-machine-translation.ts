import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * be#1066 (machine-translation epic be#1064).
 *
 * 1. field_translation's polymorphic entity_type/entity_id pair becomes one
 *    nullable FK per translated table, ON DELETE CASCADE, with a CHECK that
 *    exactly one is set and a partial unique index per FK (replacing the
 *    unique index on language_id, entity_type, entity_id, field_name).
 * 2. New columns for machine translation: origin, status, source_hash,
 *    attempts, last_error_code, model, updated_at; translation becomes
 *    nullable (pending/failed rows have no text yet).
 * 3. opportunity.original_language_id: the language title/info were typed in.
 *
 * Existing rows are all seeded reference data: origin/status defaults
 * ('reference'/'done') backfill them. Rows that cannot be mapped to an FK
 * (a type without a translated table, or a target row that no longer exists)
 * are counted and deleted before the constraints are added.
 *
 * Self-contained: enum values and table names are literals, not imported.
 */

// entity_type value -> FK column, for every table that keeps translations.
const FK_BY_ENTITY_TYPE: Record<string, { column: string; table: string }> = {
  opportunity: { column: "opportunity_id", table: "opportunity" },
  language: { column: "translated_language_id", table: "language" },
  category: { column: "category_id", table: "category" },
  activity: { column: "activity_id", table: "activity" },
  skill: { column: "skill_id", table: "skill" },
  agent_type: { column: "agent_type_id", table: "agent_type" },
  service: { column: "service_id", table: "service" },
  lead_from: { column: "lead_from_id", table: "lead_from" },
};

const FK_COLUMNS = Object.values(FK_BY_ENTITY_TYPE).map(({ column }) => column);
const FK_COLUMN_LIST = FK_COLUMNS.map((column) => `"${column}"`).join(", ");

// Constraint names are TypeORM's (as `migration:generate` derives them), so
// the entity and the schema stay in sync.
const FK_CONSTRAINTS: { name: string; column: string; table: string }[] = [
  { name: "FK_5e4758f94002ebcc0397279f7b5", ...FK_BY_ENTITY_TYPE.opportunity },
  { name: "FK_00dfb75fd8c1d032fcd787aae0a", ...FK_BY_ENTITY_TYPE.language },
  { name: "FK_477152153725c75a689d034e623", ...FK_BY_ENTITY_TYPE.category },
  { name: "FK_c92b718f4f93681a46ccf481d26", ...FK_BY_ENTITY_TYPE.activity },
  { name: "FK_53a8f8a1764e980bd65f8ec09a5", ...FK_BY_ENTITY_TYPE.skill },
  { name: "FK_d20a198e2c56fd8156d2f48188f", ...FK_BY_ENTITY_TYPE.agent_type },
  { name: "FK_1e2157b757dbb5158ce8c900961", ...FK_BY_ENTITY_TYPE.service },
  { name: "FK_5305020f4bb5ebbd7397c43d689", ...FK_BY_ENTITY_TYPE.lead_from },
];

const UNIQUE_INDEXES: { name: string; column: string }[] = [
  { name: "UQ_field_translation_opportunity", column: "opportunity_id" },
  {
    name: "UQ_field_translation_translated_language",
    column: "translated_language_id",
  },
  { name: "UQ_field_translation_category", column: "category_id" },
  { name: "UQ_field_translation_activity", column: "activity_id" },
  { name: "UQ_field_translation_skill", column: "skill_id" },
  { name: "UQ_field_translation_agent_type", column: "agent_type_id" },
  { name: "UQ_field_translation_service", column: "service_id" },
  { name: "UQ_field_translation_lead_from", column: "lead_from_id" },
];

const OPPORTUNITY_ORIGINAL_LANGUAGE_FK = "FK_4374b3650e550a9b1a3e04c3a57";
const OLD_UNIQUE_INDEX = "IDX_cd9cbf582b713498a61c626c2d";

// Values of the dropped field_translation_entity_type_enum, as they were.
const OLD_ENTITY_TYPES = [
  "none",
  "activity",
  "agent",
  "agent_type",
  "category",
  "comment",
  "district",
  "language",
  "lead_from",
  "opportunity",
  "service",
  "skill",
  "volunteer",
];

export class ExtendFieldTranslationForMachineTranslation1790601064552
  implements MigrationInterface
{
  name = "ExtendFieldTranslationForMachineTranslation1790601064552";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- new columns (origin/status defaults backfill existing rows) ---
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_origin_enum" AS ENUM('reference', 'machine', 'human')`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "origin" "public"."field_translation_origin_enum" NOT NULL DEFAULT 'reference'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_status_enum" AS ENUM('pending', 'done', 'failed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "status" "public"."field_translation_status_enum" NOT NULL DEFAULT 'done'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "source_hash" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "attempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "last_error_code" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "model" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "translation" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "original_language_id" integer`,
    );

    // --- entity_type/entity_id -> one FK column per table ---
    for (const column of FK_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "field_translation" ADD "${column}" integer`,
      );
    }
    for (const [entityType, { column }] of Object.entries(FK_BY_ENTITY_TYPE)) {
      await queryRunner.query(
        `UPDATE "field_translation" SET "${column}" = "entity_id" WHERE "entity_type" = '${entityType}'`,
      );
    }

    // --- orphans: rows no FK can represent ---
    let danglingCount = 0;
    for (const { column, table } of Object.values(FK_BY_ENTITY_TYPE)) {
      const deleted: unknown[] = await queryRunner.query(
        `DELETE FROM "field_translation" ft
         WHERE ft."${column}" IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM "${table}" t WHERE t."id" = ft."${column}")
         RETURNING ft."id"`,
      );
      danglingCount += deleted[0] instanceof Array ? deleted[0].length : 0;
    }
    const unmapped: unknown[] = await queryRunner.query(
      `DELETE FROM "field_translation"
       WHERE num_nonnulls(${FK_COLUMN_LIST}) = 0
       RETURNING "id"`,
    );
    const unmappedCount = unmapped[0] instanceof Array ? unmapped[0].length : 0;
    console.warn(
      `[extend-field-translation] deleted ${danglingCount} row(s) pointing at a missing row, ${unmappedCount} row(s) of a type without a translated table`,
    );

    // --- drop the polymorphic pair ---
    await queryRunner.query(`DROP INDEX "public"."${OLD_UNIQUE_INDEX}"`);
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP COLUMN "entity_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP COLUMN "entity_id"`,
    );

    // --- constraints and indexes ---
    await queryRunner.query(
      `CREATE INDEX "IDX_field_translation_pending" ON "field_translation" ("updated_at") WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_field_translation_reference_text" ON "field_translation" ("translation") WHERE "origin" = 'reference'`,
    );
    for (const { name, column } of UNIQUE_INDEXES) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "${name}" ON "field_translation" ("${column}", "field_name", "language_id") WHERE "${column}" IS NOT NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "CHK_field_translation_one_target" CHECK (num_nonnulls(${FK_COLUMN_LIST}) = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "${OPPORTUNITY_ORIGINAL_LANGUAGE_FK}" FOREIGN KEY ("original_language_id") REFERENCES "language"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    for (const { name, column, table } of FK_CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE "field_translation" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "${table}"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { name } of FK_CONSTRAINTS) {
      await queryRunner.query(
        `ALTER TABLE "field_translation" DROP CONSTRAINT "${name}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "${OPPORTUNITY_ORIGINAL_LANGUAGE_FK}"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "CHK_field_translation_one_target"`,
    );
    for (const { name } of UNIQUE_INDEXES) {
      await queryRunner.query(`DROP INDEX "public"."${name}"`);
    }
    await queryRunner.query(
      `DROP INDEX "public"."IDX_field_translation_reference_text"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_field_translation_pending"`,
    );

    // --- restore entity_type/entity_id from whichever FK is set ---
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum" AS ENUM(${OLD_ENTITY_TYPES.map((value) => `'${value}'`).join(", ")})`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "entity_type" "public"."field_translation_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "entity_id" integer`,
    );
    for (const [entityType, { column }] of Object.entries(FK_BY_ENTITY_TYPE)) {
      await queryRunner.query(
        `UPDATE "field_translation" SET "entity_type" = '${entityType}', "entity_id" = "${column}" WHERE "${column}" IS NOT NULL`,
      );
    }
    // Pending/failed machine rows have no text and can't satisfy the old
    // NOT NULL; they are a queue, not data, and are dropped.
    await queryRunner.query(
      `DELETE FROM "field_translation" WHERE "translation" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "entity_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ALTER COLUMN "translation" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "${OLD_UNIQUE_INDEX}" ON "field_translation" ("language_id", "entity_type", "entity_id", "field_name")`,
    );

    // --- drop the new columns ---
    for (const column of FK_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "field_translation" DROP COLUMN "${column}"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "original_language_id"`,
    );
    for (const column of [
      "updated_at",
      "model",
      "last_error_code",
      "attempts",
      "source_hash",
      "status",
      "origin",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "field_translation" DROP COLUMN "${column}"`,
      );
    }
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."field_translation_origin_enum"`,
    );
  }
}
