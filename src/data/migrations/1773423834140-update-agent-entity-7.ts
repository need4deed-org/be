import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity71773423834140 implements MigrationInterface {
  name = "UpdateAgentEntity71773423834140";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "agent_language" ("id" SERIAL NOT NULL, "agent_id" integer NOT NULL, "language_id" integer NOT NULL, CONSTRAINT "PK_c4b59dce9dddd19cb7ab607b1ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_language" ADD CONSTRAINT "FK_655274b2246207a662e3940b0d4" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_language" ADD CONSTRAINT "FK_c58ded607e284db17d03e9eb20b" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_language" DROP CONSTRAINT "FK_c58ded607e284db17d03e9eb20b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_language" DROP CONSTRAINT "FK_655274b2246207a662e3940b0d4"`,
    );
    await queryRunner.query(`DROP TABLE "agent_language"`);
  }
}
