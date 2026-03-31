import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerReturnDate1769183878914 implements MigrationInterface {
  name = "AddVolunteerReturnDate1769183878914";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "volunteer" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "date_return" TIMESTAMP`,
    );
    await queryRunner.query(
      `UPDATE "volunteer" SET "status_engagement"='new' WHERE "status_engagement" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" SET DEFAULT 'new'`,
    );
    await queryRunner.query(
      `UPDATE "volunteer" SET "status_match"='no-matches' WHERE "status_match" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET DEFAULT 'no-matches'`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "operator_type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."agent_operator_type_enum" AS ENUM('organization', 'person')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "operator_type" "public"."agent_operator_type_enum" NOT NULL DEFAULT 'organization'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "operator_type"`);
    await queryRunner.query(`DROP TYPE "public"."agent_operator_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "operator_type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP COLUMN "date_return"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_enum" AS ENUM('New', 'Opportunity sent', 'Matched', 'Active regular', 'Active accompany', 'Active fest', 'To rematch', 'Temp inactive', 'Inactive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "status" "public"."volunteer_status_enum" NOT NULL DEFAULT 'New'`,
    );
  }
}
