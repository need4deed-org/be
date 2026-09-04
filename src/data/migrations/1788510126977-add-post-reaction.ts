import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostReaction1788510126977 implements MigrationInterface {
  name = "AddPostReaction1788510126977";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_reaction" ("id" SERIAL NOT NULL, "post_id" integer NOT NULL, "person_id" integer NOT NULL, "emoji" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_72c5fe23f6a0f35b8c2ba78945f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_312b61f7a2ce482b35a2d2b2b6" ON "post_reaction" ("post_id", "person_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reaction" ADD CONSTRAINT "FK_860c24b55da4541f8322a2bdced" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reaction" ADD CONSTRAINT "FK_7fd23724118ddbf077a951ebdc5" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_reaction" DROP CONSTRAINT "FK_7fd23724118ddbf077a951ebdc5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_reaction" DROP CONSTRAINT "FK_860c24b55da4541f8322a2bdced"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_312b61f7a2ce482b35a2d2b2b6"`,
    );
    await queryRunner.query(`DROP TABLE "post_reaction"`);
  }
}
