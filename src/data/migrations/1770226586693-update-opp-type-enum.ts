import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOppTypeEnum1770226586693 implements MigrationInterface {
  name = "UpdateOppTypeEnum1770226586693";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "opportunity" SET "type" = 'accompanying' WHERE "type" = 'volunteering'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_type_enum" RENAME TO "opportunity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_type_enum" AS ENUM('accompanying', 'regular', 'events')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "type" TYPE "public"."opportunity_type_enum" USING "type"::"text"::"public"."opportunity_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_type_enum_old" AS ENUM('volunteering', 'accompanying')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "type" TYPE "public"."opportunity_type_enum_old" USING "type"::"text"::"public"."opportunity_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_type_enum_old" RENAME TO "opportunity_type_enum"`,
    );
  }
}
