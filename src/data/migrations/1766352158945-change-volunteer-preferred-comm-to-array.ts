import { MigrationInterface, QueryRunner } from "typeorm";

// VolunteerCommunicationType values as of this migration — hardcoded (not
// imported from the SDK) so a later contract change to that enum can't
// retroactively alter this historical migration's CHECK constraint / default.
const COMMUNICATION_TYPES = [
  "email",
  "mobilePhone",
  "whatsapp",
  "telegram",
  "sms",
];
const DEFAULT_COMMUNICATION_TYPE = "mobilePhone";

export class ChangeVolunteerPreferredCommToArray1766352158945
  implements MigrationInterface
{
  name = "ChangeVolunteerPreferredCommToArray1766352158945";
  allowedValues = COMMUNICATION_TYPES.map((v) => `'${v}'`).join(",");

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
      ADD "preferred_communication_type" text array NOT NULL DEFAULT ARRAY['${DEFAULT_COMMUNICATION_TYPE}']
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
      ADD "preferred_communication_type" "public"."volunteer_preferred_communication_type_enum" NOT NULL DEFAULT '${DEFAULT_COMMUNICATION_TYPE}'
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS validate_communication_types(text[])
    `);
  }
}
