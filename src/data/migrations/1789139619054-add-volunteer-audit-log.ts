import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerAuditLog1789139619054 implements MigrationInterface {
  name = "AddVolunteerAuditLog1789139619054";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "volunteer_audit_log" ("id" SERIAL NOT NULL, "volunteer_id" integer NOT NULL, "type" character varying NOT NULL, "detail" text NOT NULL, "actor_user_id" integer, "occurred_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_7b9770659366105af3cadf6474f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8ebb93a9d0e7e189ef6340252" ON "volunteer_audit_log" ("volunteer_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ADD CONSTRAINT "FK_b8ebb93a9d0e7e189ef63402529" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" ADD CONSTRAINT "FK_ee96be8cc1d992a37aeec931d83" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" DROP CONSTRAINT "FK_ee96be8cc1d992a37aeec931d83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_audit_log" DROP CONSTRAINT "FK_b8ebb93a9d0e7e189ef63402529"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8ebb93a9d0e7e189ef6340252"`,
    );
    await queryRunner.query(`DROP TABLE "volunteer_audit_log"`);
  }
}
