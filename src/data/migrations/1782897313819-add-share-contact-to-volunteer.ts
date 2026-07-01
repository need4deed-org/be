import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShareContactToVolunteer1782897313819
  implements MigrationInterface
{
  name = "AddShareContactToVolunteer1782897313819";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "share_contact" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP COLUMN "share_contact"`,
    );
  }
}
