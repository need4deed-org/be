import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfigDropVolunteerListMv1763036250587
  implements MigrationInterface
{
  name = "UpdateVolunteerListMv1763036250587";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."config_config_key_enum" AS ENUM('schema', 'reference_data', 'master_data')`,
    );
    await queryRunner.query(
      `CREATE TABLE "config" ("id" SERIAL NOT NULL, "config_key" "public"."config_config_key_enum" NOT NULL, "config_value" character varying, CONSTRAINT "PK_d0ee79a681413d50b0a4f98cf7b" PRIMARY KEY ("id"))`,
    );

    // Drop the view first for idempotency
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS volunteer_list_mv;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "config"`);
    await queryRunner.query(`DROP TYPE "public"."config_config_key_enum"`);
  }
}
