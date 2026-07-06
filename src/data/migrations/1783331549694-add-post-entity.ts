import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostEntity1783331549694 implements MigrationInterface {
  name = "AddPostEntity1783331549694";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post" ("id" SERIAL NOT NULL, "text" text NOT NULL, "author_id" integer NOT NULL, "agent_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "post_tagged_person" ("post_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "PK_31a9cc0d2537296ff83168671d9" PRIMARY KEY ("post_id", "person_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5fc08b9a9f86f71a96b768b8bc" ON "post_tagged_person" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_baecb9a8491881fbe3952f52e5" ON "post_tagged_person" ("person_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "post_linked_opportunity" ("post_id" integer NOT NULL, "opportunity_id" integer NOT NULL, CONSTRAINT "PK_26a181e794cb00bd13d122a88c6" PRIMARY KEY ("post_id", "opportunity_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a85fab36a4231966953a20f4d" ON "post_linked_opportunity" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c6a8cd35d93d57b8b7821ea3a" ON "post_linked_opportunity" ("opportunity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_2f1a9ca8908fc8168bc18437f62" FOREIGN KEY ("author_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_60618b67a1e1043df6380caa22f" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_tagged_person" ADD CONSTRAINT "FK_5fc08b9a9f86f71a96b768b8bc1" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_tagged_person" ADD CONSTRAINT "FK_baecb9a8491881fbe3952f52e54" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_linked_opportunity" ADD CONSTRAINT "FK_2a85fab36a4231966953a20f4db" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_linked_opportunity" ADD CONSTRAINT "FK_0c6a8cd35d93d57b8b7821ea3a1" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_linked_opportunity" DROP CONSTRAINT "FK_0c6a8cd35d93d57b8b7821ea3a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_linked_opportunity" DROP CONSTRAINT "FK_2a85fab36a4231966953a20f4db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_tagged_person" DROP CONSTRAINT "FK_baecb9a8491881fbe3952f52e54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_tagged_person" DROP CONSTRAINT "FK_5fc08b9a9f86f71a96b768b8bc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_60618b67a1e1043df6380caa22f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_2f1a9ca8908fc8168bc18437f62"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0c6a8cd35d93d57b8b7821ea3a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a85fab36a4231966953a20f4d"`,
    );
    await queryRunner.query(`DROP TABLE "post_linked_opportunity"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_baecb9a8491881fbe3952f52e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5fc08b9a9f86f71a96b768b8bc"`,
    );
    await queryRunner.query(`DROP TABLE "post_tagged_person"`);
    await queryRunner.query(`DROP TABLE "post"`);
  }
}
