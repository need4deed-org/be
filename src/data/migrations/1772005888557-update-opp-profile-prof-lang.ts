import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOppProfileProfLang1772005888557
  implements MigrationInterface
{
  name = "UpdateOppProfileProfLang1772005888557";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profile" DROP COLUMN "volunteering_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."profile_volunteering_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_language_purpose_enum" AS ENUM('general', 'translation', 'recipient')`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" ADD "purpose" "public"."profile_language_purpose_enum" DEFAULT 'general'`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "number_volunteers" integer NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "number_volunteers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_language" DROP COLUMN "purpose"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."profile_language_purpose_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_volunteering_type_enum" AS ENUM('accompanying', 'regular', 'events', 'regular-accompanying')`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD "volunteering_type" "public"."profile_volunteering_type_enum"`,
    );
  }
}
