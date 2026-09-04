import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostBookmark1788520622361 implements MigrationInterface {
  name = "AddPostBookmark1788520622361";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_bookmark" ("id" SERIAL NOT NULL, "post_id" integer NOT NULL, "person_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3eddededf6f6b7b00f08d327831" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_64be12db263439a6530eaece63" ON "post_bookmark" ("post_id", "person_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ADD CONSTRAINT "FK_a2681879c95487a275c3b9f3d31" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" ADD CONSTRAINT "FK_e0ff478c2c841ad934e6820962a" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" DROP CONSTRAINT "FK_e0ff478c2c841ad934e6820962a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_bookmark" DROP CONSTRAINT "FK_a2681879c95487a275c3b9f3d31"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64be12db263439a6530eaece63"`,
    );
    await queryRunner.query(`DROP TABLE "post_bookmark"`);
  }
}
