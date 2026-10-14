import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerOwnerAgent1791914973367 implements MigrationInterface {
  name = "AddVolunteerOwnerAgent1791914973367";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "owner_agent_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD "shares_volunteers" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_volunteer_owner_agent" ON "volunteer" ("owner_agent_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "FK_c9c5b54f8f902bb77974b18d986" FOREIGN KEY ("owner_agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "FK_c9c5b54f8f902bb77974b18d986"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_volunteer_owner_agent"`);
    await queryRunner.query(
      `ALTER TABLE "agent" DROP COLUMN "shares_volunteers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP COLUMN "owner_agent_id"`,
    );
  }
}
