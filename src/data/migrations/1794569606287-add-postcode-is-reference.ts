import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostcodeIsReference1794569606287 implements MigrationInterface {
  name = "AddPostcodeIsReference1794569606287";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "postcode" ADD "is_reference" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "postcode" DROP COLUMN "is_reference"`,
    );
  }
}
