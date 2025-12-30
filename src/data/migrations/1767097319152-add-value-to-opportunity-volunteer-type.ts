import { MigrationInterface, QueryRunner } from "typeorm";

export class AddValueToOpportunityVolunteerType1767097319152
  implements MigrationInterface
{
  name = "AddValueToOpportunityVolunteerType1767097319152";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "chk_valid_communication_types"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_type_enum" RENAME TO "volunteer_status_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_type_enum" AS ENUM('accompanying', 'regular', 'events', 'regular-accompanying')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_type" TYPE "public"."volunteer_status_type_enum" USING "status_type"::"text"::"public"."volunteer_status_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_type_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_type_enum_old" AS ENUM('accompanying', 'regular', 'events')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_type" TYPE "public"."volunteer_status_type_enum_old" USING "status_type"::"text"::"public"."volunteer_status_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_type_enum_old" RENAME TO "volunteer_status_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "chk_valid_communication_types" CHECK (validate_communication_types(preferred_communication_type))`,
    );
  }
}
