import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiKey1786800615564 implements MigrationInterface {
  name = "AddApiKey1786800615564";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" SERIAL NOT NULL, "label" character varying NOT NULL, "key_hash" character varying NOT NULL, "user_id" integer NOT NULL, "revoked_at" TIMESTAMP, "last_used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b1bd840641b8acbaad89c3d8d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_14747b6de7344b8b456573605c" ON "api_key" ("label") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3c9751d2a6011ba13e27838105" ON "api_key" ("key_hash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ADD CONSTRAINT "FK_6a0830f03e537b239a53269b27d" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_key" DROP CONSTRAINT "FK_6a0830f03e537b239a53269b27d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c9751d2a6011ba13e27838105"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_14747b6de7344b8b456573605c"`,
    );
    await queryRunner.query(`DROP TABLE "api_key"`);
  }
}
