import { MigrationInterface, QueryRunner } from "typeorm";

export class DropFieldTranslationCategory1795528604613
  implements MigrationInterface
{
  name = "DropFieldTranslationCategory1795528604613";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "public"."field_translation" WHERE "category_id" IS NOT NULL`,
    );
    // TypeORM doesn't diff @Check; DROP COLUMN would otherwise drop it silently.
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "CHK_field_translation_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "FK_477152153725c75a689d034e623"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_field_translation_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "CHK_field_translation_one_target" CHECK (num_nonnulls("opportunity_id", "translated_language_id", "activity_id", "skill_id", "agent_type_id", "service_id", "lead_from_id", "organization_id") = 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_translation" DROP CONSTRAINT "CHK_field_translation_one_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD "category_id" integer`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_field_translation_category" ON "field_translation" ("category_id", "field_name", "language_id") WHERE (category_id IS NOT NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "FK_477152153725c75a689d034e623" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_translation" ADD CONSTRAINT "CHK_field_translation_one_target" CHECK (num_nonnulls("opportunity_id", "translated_language_id", "category_id", "activity_id", "skill_id", "agent_type_id", "service_id", "lead_from_id", "organization_id") = 1)`,
    );
  }
}
