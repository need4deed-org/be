import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexCommentPersonPersonId1780432006040
  implements MigrationInterface
{
  name = "AddIndexCommentPersonPersonId1780432006040";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_81d4ae770167ca1c3196b3c3b5" ON "comment_person" ("person_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_81d4ae770167ca1c3196b3c3b5"`,
    );
  }
}
