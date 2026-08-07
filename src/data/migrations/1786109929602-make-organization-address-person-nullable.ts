import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeOrganizationAddressPersonNullable1786109929602
  implements MigrationInterface
{
  name = "MakeOrganizationAddressPersonNullable1786109929602";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_0f31fe3925535afb5462326d7d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_e94553ff34338a3882ed305a74d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "address_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "person_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_engagement_status_enum" RENAME TO "agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_engagement_status_enum" AS ENUM('agent-new', 'agent-active', 'agent-unresponsive', 'agent-inactive', 'agent-incontact', 'agent-tried-to-contact')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" TYPE "public"."agent_engagement_status_enum" USING "engagement_status"::"text"::"public"."agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" SET DEFAULT 'agent-new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_0f31fe3925535afb5462326d7d6" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_e94553ff34338a3882ed305a74d" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_e94553ff34338a3882ed305a74d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "FK_0f31fe3925535afb5462326d7d6"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_engagement_status_enum_old" AS ENUM('agent-active', 'agent-inactive', 'agent-new', 'agent-unresponsive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" TYPE "public"."agent_engagement_status_enum_old" USING "engagement_status"::"text"::"public"."agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" SET DEFAULT 'agent-new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_engagement_status_enum_old" RENAME TO "agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "person_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ALTER COLUMN "address_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_e94553ff34338a3882ed305a74d" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_0f31fe3925535afb5462326d7d6" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
