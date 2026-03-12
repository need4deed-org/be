import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity6AgentPerson1773268076415
  implements MigrationInterface
{
  name = "UpdateAgentEntity6AgentPerson1773268076415";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_d78c87230af992a1bf93c5b93ae"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_person_role_enum" AS ENUM('social-worker', 'volunteer-coordinator', 'manager', 'project-coordinator', 'psychologist', 'project-staff', 'childcare-worker', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_person" ("id" SERIAL NOT NULL, "role" "public"."agent_person_role_enum" NOT NULL DEFAULT 'other', "agent_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "PK_d78c87230af992a1bf93c5b93ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "operator_id"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "person_id"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "operator_type"`);
    await queryRunner.query(`DROP TYPE "public"."agent_operator_type_enum"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "info" character varying`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "organization_id" integer`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."field_translation_entity_type_enum" RENAME TO "field_translation_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."option_item_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_content_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "timeline" ALTER COLUMN "content_entity_type" TYPE "public"."timeline_content_entity_type_enum" USING "content_entity_type"::"text"::"public"."timeline_content_entity_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."timeline_content_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cd9cbf582b713498a61c626c2d" ON "field_translation" ("language_id", "entity_type", "entity_id", "field_name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68fcd3be0d9a16a5b6c8371133" ON "timeline" ("target_entity_type", "target_entity_id", "timestamp") `,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_92b5f704c0b5e65fb0698240744" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_person" ADD CONSTRAINT "FK_ffb35bb3606febae68541916709" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_person" ADD CONSTRAINT "FK_1fc545aa66757a901d425e88f0b" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_person" DROP CONSTRAINT "FK_1fc545aa66757a901d425e88f0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_person" DROP CONSTRAINT "FK_ffb35bb3606febae68541916709"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_92b5f704c0b5e65fb0698240744"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_68fcd3be0d9a16a5b6c8371133"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd9cbf582b713498a61c626c2d"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."timeline_content_entity_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_target_entity_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."timeline_source_entity_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
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
      `CREATE TYPE "public"."option_item_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "option" ALTER COLUMN "item_type" TYPE "public"."option_item_type_enum_old" USING "item_type"::"text"::"public"."option_item_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."option_item_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."option_item_type_enum_old" RENAME TO "option_item_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."field_translation_entity_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
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
      `ALTER TABLE "agent" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "info"`);
    await queryRunner.query(
      `CREATE TYPE "public"."agent_operator_type_enum" AS ENUM('organization', 'person')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "operator_type" "public"."agent_operator_type_enum" NOT NULL DEFAULT 'organization'`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "person_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "operator_id" integer NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "agent_person"`);
    await queryRunner.query(`DROP TYPE "public"."agent_person_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_d78c87230af992a1bf93c5b93ae" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
