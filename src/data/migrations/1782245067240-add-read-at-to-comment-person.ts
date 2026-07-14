import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReadAtToCommentPerson1782245067240
  implements MigrationInterface
{
  name = "AddReadAtToCommentPerson1782245067240";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment_person" ADD "read_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment_person" DROP COLUMN "read_at"`,
    );
  }
}
