import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfigKey1770713139121 implements MigrationInterface {
  name = "AddConfigKey1770713139121";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."config_config_key_enum" RENAME TO "config_config_key_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."config_config_key_enum" AS ENUM('schema', 'reference_data', 'master_data', 'truncate-all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "config" ALTER COLUMN "config_key" TYPE "public"."config_config_key_enum" USING "config_key"::"text"::"public"."config_config_key_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."config_config_key_enum_old"`);
    await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "config_value"`);
    await queryRunner.query(`ALTER TABLE "config" ADD "config_value" boolean`);
    await queryRunner.query(
      `ALTER TABLE "accompanying" ALTER COLUMN "phone" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "accompanying" ALTER COLUMN "email" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accompanying" ALTER COLUMN "email" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "accompanying" ALTER COLUMN "phone" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "config" DROP COLUMN "config_value"`);
    await queryRunner.query(
      `ALTER TABLE "config" ADD "config_value" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."config_config_key_enum_old" AS ENUM('schema', 'reference_data', 'master_data')`,
    );
    await queryRunner.query(
      `ALTER TABLE "config" ALTER COLUMN "config_key" TYPE "public"."config_config_key_enum_old" USING "config_key"::"text"::"public"."config_config_key_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."config_config_key_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."config_config_key_enum_old" RENAME TO "config_config_key_enum"`,
    );
  }
}
