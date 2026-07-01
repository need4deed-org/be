import { MigrationInterface, QueryRunner } from "typeorm";

export class CommunicationNullableFksAndOpportunityRelation1782903516653
  implements MigrationInterface
{
  name = "CommunicationNullableFksAndOpportunityRelation1782903516653";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "CHK_31faa29cb0aff6ef55be2b2146"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ADD "opportunity_id" integer`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."communication_communication_type_enum" RENAME TO "communication_communication_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_communication_type_enum" AS ENUM('briefed', 'first-inquiry-sent', 'opportunity-list-sent', 'status-update', 'post-match-followup', 'matched', 'accompanying-not-found', 'accompanying-matched', 'opportunity-updated', 'opportunity-confirmation')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "communication_type" TYPE "public"."communication_communication_type_enum" USING "communication_type"::"text"::"public"."communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_communication_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "date" SET DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "communication" ADD CONSTRAINT "CHK_0ea4b79edeac5eaa19c54735c7" CHECK (
  (CASE WHEN "volunteer_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "agent_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "opportunity_id" IS NOT NULL THEN 1 ELSE 0 END) >= 1
)`);
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_73aa11f1d453a65ba3cebda85fb" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove rows that cannot survive the rollback:
    // (a) rows whose communication_type is one of the 5 new enum values added in up() —
    //     the USING cast to the old enum would throw 'invalid input value for enum'.
    // (b) rows where only opportunity_id is set (volunteer_id = NULL, agent_id = NULL) —
    //     after opportunity_id is dropped, those rows would violate the restored CHECK (sum = 1).
    await queryRunner.query(
      `DELETE FROM "communication" WHERE "communication_type" IN ('matched','accompanying-not-found','accompanying-matched','opportunity-updated','opportunity-confirmation')`,
    );
    await queryRunner.query(
      `DELETE FROM "communication" WHERE "volunteer_id" IS NULL AND "agent_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_73aa11f1d453a65ba3cebda85fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "CHK_0ea4b79edeac5eaa19c54735c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "date" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_communication_type_enum_old" AS ENUM('briefed', 'first-inquiry-sent', 'opportunity-list-sent', 'status-update', 'post-match-followup')`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ALTER COLUMN "communication_type" TYPE "public"."communication_communication_type_enum_old" USING "communication_type"::"text"::"public"."communication_communication_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."communication_communication_type_enum_old" RENAME TO "communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP COLUMN "opportunity_id"`,
    );
    await queryRunner.query(`ALTER TABLE "communication" ADD CONSTRAINT "CHK_31faa29cb0aff6ef55be2b2146" CHECK (((
CASE
    WHEN (volunteer_id IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (agent_id IS NOT NULL) THEN 1
    ELSE 0
END) = 1))`);
  }
}
