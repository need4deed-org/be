import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOppProfile1770126767598 implements MigrationInterface {
  name = "UpdateOppProfile1770126767598";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."profile_volunteering_type_enum" AS ENUM('accompanying', 'regular', 'events', 'regular-accompanying')`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ADD "volunteering_type" "public"."profile_volunteering_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_enum" AS ENUM('new', 'searching', 'active', 'past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "status" "public"."opportunity_status_enum" NOT NULL DEFAULT 'new'`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_volunteer_status_enum" RENAME TO "opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_volunteer_status_enum" AS ENUM('pending', 'matched', 'active', 'past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" TYPE "public"."opportunity_volunteer_status_enum" USING "status"::"text"::"public"."opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "operator_type" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "operator_type" SET DEFAULT 'organization'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_volunteer_status_enum_old" AS ENUM('suggested', 'matched', 'active', 'past', 'pending')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" TYPE "public"."opportunity_volunteer_status_enum_old" USING "status"::"text"::"public"."opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_volunteer_status_enum_old" RENAME TO "opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone'`,
    );
    await queryRunner.query(`ALTER TABLE "opportunity" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."opportunity_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "profile" DROP COLUMN "volunteering_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."profile_volunteering_type_enum"`,
    );
  }
}
