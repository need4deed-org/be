import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostEntity1783333982288 implements MigrationInterface {
  name = "AddPostEntity1783333982288";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_person" ("post_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "PK_2752a498efcea4ce067c3ced8b6" PRIMARY KEY ("post_id", "person_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d5bd5330c6c6d717fb4128190" ON "post_person" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2ec8325a53c239442778bd029" ON "post_person" ("person_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "post_opportunity" ("post_id" integer NOT NULL, "opportunity_id" integer NOT NULL, CONSTRAINT "PK_83c02a05c6699152a7619ca8de2" PRIMARY KEY ("post_id", "opportunity_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfcd3c6cd9a6db4700cd5ebe6c" ON "post_opportunity" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61a8575d8e7c30b3462fa19f6d" ON "post_opportunity" ("opportunity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post_person" ADD CONSTRAINT "FK_6d5bd5330c6c6d717fb4128190f" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_person" ADD CONSTRAINT "FK_c2ec8325a53c239442778bd029d" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_opportunity" ADD CONSTRAINT "FK_dfcd3c6cd9a6db4700cd5ebe6c0" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_opportunity" ADD CONSTRAINT "FK_61a8575d8e7c30b3462fa19f6d0" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_opportunity" DROP CONSTRAINT "FK_61a8575d8e7c30b3462fa19f6d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_opportunity" DROP CONSTRAINT "FK_dfcd3c6cd9a6db4700cd5ebe6c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_person" DROP CONSTRAINT "FK_c2ec8325a53c239442778bd029d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_person" DROP CONSTRAINT "FK_6d5bd5330c6c6d717fb4128190f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61a8575d8e7c30b3462fa19f6d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfcd3c6cd9a6db4700cd5ebe6c"`,
    );
    await queryRunner.query(`DROP TABLE "post_opportunity"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2ec8325a53c239442778bd029"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d5bd5330c6c6d717fb4128190"`,
    );
    await queryRunner.query(`DROP TABLE "post_person"`);
  }
}
