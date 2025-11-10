import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentEntity1762547510270 implements MigrationInterface {
  name = "AddCommentEntity1762547510270";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum" AS ENUM('none', 'activity', 'skill', 'category', 'language', 'lead_from', 'district', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "comment" ("id" SERIAL NOT NULL, "text" text NOT NULL, "language_id" integer, "entity_type" "public"."comment_entity_type_enum" NOT NULL DEFAULT 'none', "entity_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("language_id", "entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_f02c3b7cc4d58ca622a90d682a0" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_bbfe153fa60aa06483ed35ff4a7" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_bbfe153fa60aa06483ed35ff4a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_f02c3b7cc4d58ca622a90d682a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TYPE "public"."comment_entity_type_enum"`);
  }
}
