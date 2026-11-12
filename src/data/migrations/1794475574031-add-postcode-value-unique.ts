import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostcodeValueUnique1794475574031 implements MigrationInterface {
  name = "AddPostcodeValueUnique1794475574031";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_678d2ce9fdc97d52c007cbf723" ON "postcode" ("value") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_678d2ce9fdc97d52c007cbf723"`,
    );
  }
}
