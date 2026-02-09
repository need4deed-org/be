import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccomponyingEntity1770655462205 implements MigrationInterface {
  name = "AddAccomponyingEntity1770655462205";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."accompanying_language_to_translate_enum" AS ENUM('deutsche', 'englishOk', 'noTranslation')`,
    );
    await queryRunner.query(
      `CREATE TABLE "accompanying" ("id" SERIAL NOT NULL, "address" character varying NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "language_to_translate" "public"."accompanying_language_to_translate_enum", CONSTRAINT "PK_d0fd931d21e719a937ba4ca36ac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD "accompanying_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD CONSTRAINT "FK_29c4499dad6806454963a1e302e" FOREIGN KEY ("accompanying_id") REFERENCES "accompanying"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profile" DROP CONSTRAINT "FK_29c4499dad6806454963a1e302e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" DROP COLUMN "accompanying_id"`,
    );
    await queryRunner.query(`DROP TABLE "accompanying"`);
    await queryRunner.query(
      `DROP TYPE "public"."accompanying_language_to_translate_enum"`,
    );
  }
}
