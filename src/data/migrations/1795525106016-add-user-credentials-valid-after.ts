import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCredentialsValidAfter1795525106016
  implements MigrationInterface
{
  name = "AddUserCredentialsValidAfter1795525106016";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "credentials_valid_after" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "credentials_valid_after"`,
    );
  }
}
