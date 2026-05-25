import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncEntitiesDdl1779737272182 implements MigrationInterface {
  name = "SyncEntitiesDdl1779737272182";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."communication_contact_method_enum" RENAME TO "communication_contact_method_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_contact_method_enum" AS ENUM('email', 'phone-number', 'telegram', 'whatsapp', 'signal', 'sms', 'voicenote', 'video-call')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "contact_method" TYPE "public"."communication_contact_method_enum" USING "contact_method"::"text"::"public"."communication_contact_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_contact_method_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."communication_contact_method_enum_old" AS ENUM('email', 'phone-number', 'telegram', 'whatsapp', 'signal', 'sms', 'voicenote')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "contact_method" TYPE "public"."communication_contact_method_enum_old" USING "contact_method"::"text"::"public"."communication_contact_method_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_contact_method_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."communication_contact_method_enum_old" RENAME TO "communication_contact_method_enum"`,
    );
  }
}
