import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostcodeToAccompanying1778578280034
  implements MigrationInterface
{
  name = "AddPostcodeToAccompanying1778578280034";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accompanying" ADD "postcode_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "accompanying" ADD CONSTRAINT "FK_a48f002dffae26a9642e2f7cefb" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accompanying" DROP CONSTRAINT "FK_a48f002dffae26a9642e2f7cefb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accompanying" DROP COLUMN "postcode_id"`,
    );
  }
}
