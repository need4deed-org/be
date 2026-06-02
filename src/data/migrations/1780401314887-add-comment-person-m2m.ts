import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentPersonM2m1780401314887 implements MigrationInterface {
  name = "AddCommentPersonM2m1780401314887";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "comment_person" ("id" SERIAL NOT NULL, "comment_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "PK_f3a5d50a9812f4f4a03921497f7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_person" ADD CONSTRAINT "FK_a32624ba70e3dc1462329a6323e" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_person" ADD CONSTRAINT "FK_81d4ae770167ca1c3196b3c3b52" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment_person" DROP CONSTRAINT "FK_81d4ae770167ca1c3196b3c3b52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_person" DROP CONSTRAINT "FK_a32624ba70e3dc1462329a6323e"`,
    );
    await queryRunner.query(`DROP TABLE "comment_person"`);
  }
}
