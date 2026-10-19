import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCgcApplicationEmailCommunicationType1792421670210
  implements MigrationInterface
{
  name = "AddCgcApplicationEmailCommunicationType1792421670210";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."communication_communication_type_enum" RENAME TO "communication_communication_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_communication_type_enum" AS ENUM('briefed', 'first-inquiry-sent', 'opportunity-list-sent', 'status-update', 'post-match-followup', 'accompanying-matched', 'matched', 'opportunity-confirmation', 'accompanying-not-found', 'opportunity-updated', 'cgc-application-email')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "communication_type" TYPE "public"."communication_communication_type_enum" USING "communication_type"::"text"::"public"."communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_communication_type_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."communication_communication_type_enum_old" AS ENUM('accompanying-matched', 'accompanying-not-found', 'briefed', 'first-inquiry-sent', 'matched', 'opportunity-confirmation', 'opportunity-list-sent', 'opportunity-updated', 'post-match-followup', 'status-update')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "communication_type" TYPE "public"."communication_communication_type_enum_old" USING "communication_type"::"text"::"public"."communication_communication_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."communication_communication_type_enum_old" RENAME TO "communication_communication_type_enum"`,
    );
  }
}
