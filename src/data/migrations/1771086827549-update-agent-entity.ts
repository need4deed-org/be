import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity1771086827549 implements MigrationInterface {
  name = "UpdateAgentEntity1771086827549";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "website" character varying`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_trust_level_enum" AS ENUM('high', 'low', 'unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "trust_level" "public"."agent_trust_level_enum" NOT NULL DEFAULT 'unknown'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_search_status_enum" AS ENUM('searching', 'not-needed', 'volunteers-found')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "search_status" "public"."agent_search_status_enum" NOT NULL DEFAULT 'not-needed'`,
    );
    await queryRunner.query(`ALTER TABLE "agent" ADD "services" text array`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD "website" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum" RENAME TO "agent_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum" AS ENUM('rac', 'ngo')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" TYPE "public"."agent_type_enum" USING lower("type"::"text")::"public"."agent_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" SET DEFAULT 'rac'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "operator_type" SET DEFAULT 'organization'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "operator_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum_old" AS ENUM('NGO', 'RAC')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" TYPE "public"."agent_type_enum_old" USING upper("type"::"text")::"public"."agent_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" SET DEFAULT 'RAC'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum_old" RENAME TO "agent_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "website"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "services"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "search_status"`);
    await queryRunner.query(`DROP TYPE "public"."agent_search_status_enum"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "trust_level"`);
    await queryRunner.query(`DROP TYPE "public"."agent_trust_level_enum"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "website"`);
  }
}
