import { MigrationInterface, QueryRunner } from "typeorm";

export class CatchTsJan211769012055276 implements MigrationInterface {
  name = "CatchTsJan211769012055276";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `CREATE TYPE "public"."volunteer_status_type_enum_old" AS ENUM('accompanying', 'regular', 'event', 'festival', 'weekend-only')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_type" TYPE "public"."volunteer_status_type_enum_old" USING "status_type"::"text"::"public"."volunteer_status_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_type_enum_old" RENAME TO "volunteer_status_type_enum"`,
    );
  }
}
