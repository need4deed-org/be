import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostAgent1791997916504 implements MigrationInterface {
  name = "AddPostAgent1791997916504";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_agent" ("post_id" integer NOT NULL, "agent_id" integer NOT NULL, CONSTRAINT "PK_533e37fc13e7cfc61dbd6af30bc" PRIMARY KEY ("post_id", "agent_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bd75f9b8f487d9d78543e16a0" ON "post_agent" ("post_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d10eb35318297c096c6d58169" ON "post_agent" ("agent_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post_agent" ADD CONSTRAINT "FK_9bd75f9b8f487d9d78543e16a08" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_agent" ADD CONSTRAINT "FK_2d10eb35318297c096c6d581694" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_agent" DROP CONSTRAINT "FK_2d10eb35318297c096c6d581694"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_agent" DROP CONSTRAINT "FK_9bd75f9b8f487d9d78543e16a08"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d10eb35318297c096c6d58169"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bd75f9b8f487d9d78543e16a0"`,
    );
    await queryRunner.query(`DROP TABLE "post_agent"`);
  }
}
