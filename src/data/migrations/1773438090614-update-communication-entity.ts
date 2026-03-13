import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCommunicationEntity1773438090614
  implements MigrationInterface
{
  name = "UpdateCommunicationEntity1773438090614";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication" ADD "agent_id" integer`,
    );
    await queryRunner.query(`ALTER TABLE "communication" ADD CONSTRAINT "CHK_31faa29cb0aff6ef55be2b2146" CHECK (
  (CASE WHEN "volunteer_id" IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN "agent_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
)`);
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_e8f1435f58864dd4b55c47d1468" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_e8f1435f58864dd4b55c47d1468"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "CHK_31faa29cb0aff6ef55be2b2146"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP COLUMN "agent_id"`,
    );
  }
}
