import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInactiveToOppStatus1777284365646 implements MigrationInterface {
  name = "AddInactiveToOppStatus1777284365646";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_status_enum" RENAME TO "opportunity_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_enum" AS ENUM('opp-new', 'opp-searching', 'opp-active', 'opp-inactive', 'opp-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" TYPE "public"."opportunity_status_enum" USING "status"::"text"::"public"."opportunity_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" SET DEFAULT 'opp-new'`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_enum_old" AS ENUM('opp-new', 'opp-searching', 'opp-active', 'opp-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" TYPE "public"."opportunity_status_enum_old" USING "status"::"text"::"public"."opportunity_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" SET DEFAULT 'opp-new'`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_status_enum_old" RENAME TO "opportunity_status_enum"`,
    );
  }
}
