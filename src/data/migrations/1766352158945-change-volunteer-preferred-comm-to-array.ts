import { VolunteerCommunicationType } from "need4deed-sdk";
import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeVolunteerPreferredCommToArray1766352158945
  implements MigrationInterface
{
  name = "ChangeVolunteerPreferredCommToArray1766352158945";
  allowedValues = Object.values(VolunteerCommunicationType)
    .map((v) => `'${v}'`)
    .join(",");

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_communication_types(data text[])
      RETURNS boolean AS $$
      BEGIN
      RETURN (
        SELECT bool_and(elem IN (${this.allowedValues}))
        FROM unnest(data) AS elem
      );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP COLUMN "preferred_communication_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_preferred_communication_type_enum"`,
    );
    await queryRunner.query(`
      ALTER TABLE "volunteer"
      ADD "preferred_communication_type" text array NOT NULL DEFAULT ARRAY['${VolunteerCommunicationType.MOBILE_PHONE}']
    `);

    await queryRunner.query(`
      ALTER TABLE "volunteer"
      ADD CONSTRAINT "chk_valid_communication_types" 
      CHECK (validate_communication_types(preferred_communication_type))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "volunteer" 
      DROP CONSTRAINT "chk_valid_communication_types"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."volunteer_preferred_communication_type_enum" AS ENUM(${this.allowedValues})
    `);
    await queryRunner.query(`
      ALTER TABLE "volunteer" DROP COLUMN "preferred_communication_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "volunteer"
      ADD "preferred_communication_type" "public"."volunteer_preferred_communication_type_enum" NOT NULL DEFAULT '${VolunteerCommunicationType.MOBILE_PHONE}'
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS validate_communication_types(text[])
    `);
  }
}
