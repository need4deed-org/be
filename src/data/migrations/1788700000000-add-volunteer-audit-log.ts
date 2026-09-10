import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerAuditLog1788700000000 implements MigrationInterface {
  name = "AddVolunteerAuditLog1788700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "volunteer_audit_log" ("id" SERIAL NOT NULL, "volunteer_id" integer NOT NULL, "type" character varying NOT NULL, "detail" text NOT NULL, "actor_user_id" integer, "occurred_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_e3f9c9b2d4a4f7c3e1b6a8d5f2c7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a5d3c1e9f8b2a4d6c0e7f1b3a59" ON "volunteer_audit_log" ("volunteer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ADD CONSTRAINT "FK_1c4e8a2f6d9b3c5e7a1f4d8b2c60" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ADD CONSTRAINT "FK_9b2d6f0a3c7e5b1d8f4a2c6e0b71" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" DROP CONSTRAINT "FK_9b2d6f0a3c7e5b1d8f4a2c6e0b71"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" DROP CONSTRAINT "FK_1c4e8a2f6d9b3c5e7a1f4d8b2c60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a5d3c1e9f8b2a4d6c0e7f1b3a59"`,
    );
    await queryRunner.query(`DROP TABLE "volunteer_audit_log"`);
  }
}
