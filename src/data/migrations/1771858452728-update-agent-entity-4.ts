import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity41771858452728 implements MigrationInterface {
  name = "UpdateAgentEntity41771858452728";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum" ADD VALUE 'AE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum" RENAME TO "agent_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum" AS ENUM('AE', 'GU1', 'GU2', 'GU2+', 'GU3', 'NU', 'ASOG', 'counseling-center', 'tandem', 'multiple-social-support')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" TYPE "public"."agent_type_enum" USING 'AE'::"text"::"public"."agent_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_type_enum_old" AS ENUM('rac', 'ngo')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum" ADD VALUE 'rac'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" TYPE "public"."agent_type_enum_old" USING "type"::"text"::"public"."agent_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "type" SET DEFAULT 'rac'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_type_enum_old" RENAME TO "agent_type_enum"`,
    );
  }
}
