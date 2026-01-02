import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentEntity1767357208920 implements MigrationInterface {
  name = "AddDocumentEntity1767357208920";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."document_type_enum" AS ENUM('measles-vacc-cert', 'good-conduct-cert', 'CGC-application', 'passport-copy')`,
    );
    await queryRunner.query(
      `CREATE TABLE "document" ("id" SERIAL NOT NULL, "type" "public"."document_type_enum" NOT NULL, "s3_key" character varying NOT NULL, "original_name" character varying NOT NULL, "mime_type" character varying NOT NULL, "volunteer_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_761a987245fa09ddf48e5aafcf4" UNIQUE ("type", "volunteer_id"), CONSTRAINT "PK_e57d3357f83f3cdc0acffc3d777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "document" ADD CONSTRAINT "FK_e1d6fe65e869e2858d0acfef925" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document" DROP CONSTRAINT "FK_e1d6fe65e869e2858d0acfef925"`,
    );
    await queryRunner.query(`DROP TABLE "document"`);
    await queryRunner.query(`DROP TYPE "public"."document_type_enum"`);
  }
}
