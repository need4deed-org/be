import { MigrationInterface, QueryRunner } from "typeorm";

export class OrganizationAbout1795193838086 implements MigrationInterface {
  name = "OrganizationAbout1795193838086";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organization" ADD "about" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "about"`);
  }
}
