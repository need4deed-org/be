import { MigrationInterface, QueryRunner } from "typeorm";

export class BackfillUserCredentialsValidAfter1795526521785
  implements MigrationInterface
{
  name = "BackfillUserCredentialsValidAfter1795526521785";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "public"."user" SET "credentials_valid_after" = "deactivated_at" WHERE "deactivated_at" IS NOT NULL AND "credentials_valid_after" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "public"."user" SET "credentials_valid_after" = NULL WHERE "credentials_valid_after" = "deactivated_at"`,
    );
  }
}
