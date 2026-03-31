import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePersonEntityAddLandline1773413991868
  implements MigrationInterface
{
  name = "UpdatePersonEntityAddLandline1773413991868";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ADD "landline" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "person" DROP COLUMN "landline"`);
  }
}
