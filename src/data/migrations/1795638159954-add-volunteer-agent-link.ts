import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerAgentLink1795638159954 implements MigrationInterface {
  name = "AddVolunteerAgentLink1795638159954";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "volunteer_agent_link" ("volunteer_id" integer NOT NULL, "agent_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_abaf82ad980c961d04643aa1679" PRIMARY KEY ("volunteer_id", "agent_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_volunteer_agent_link_agent" ON "volunteer_agent_link" ("agent_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_agent_link" ADD CONSTRAINT "FK_38781ab1da1fbb59e763ffdc5c3" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_agent_link" ADD CONSTRAINT "FK_cd7ca4a10cec23e78285e79ef5d" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer_agent_link" DROP CONSTRAINT "FK_cd7ca4a10cec23e78285e79ef5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_agent_link" DROP CONSTRAINT "FK_38781ab1da1fbb59e763ffdc5c3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_volunteer_agent_link_agent"`,
    );
    await queryRunner.query(`DROP TABLE "volunteer_agent_link"`);
  }
}
