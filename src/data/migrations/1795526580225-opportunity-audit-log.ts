import { MigrationInterface, QueryRunner } from "typeorm";

export class OpportunityAuditLog1795526580225 implements MigrationInterface {
  name = "OpportunityAuditLog1795526580225";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "opportunity_audit_log" ("id" SERIAL NOT NULL, "opportunity_id" integer NOT NULL, "type" character varying NOT NULL, "detail" text NOT NULL, "actor_user_id" integer, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_bd41f8e59a6cff9f53b9b355215" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24a55c80aacecf119dda0fcf26" ON "opportunity_audit_log" ("opportunity_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_audit_log" ADD CONSTRAINT "FK_24a55c80aacecf119dda0fcf26d" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_audit_log" ADD CONSTRAINT "FK_142b8edd4b36b7b5dc088afbcc2" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_audit_log" DROP CONSTRAINT "FK_142b8edd4b36b7b5dc088afbcc2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_audit_log" DROP CONSTRAINT "FK_24a55c80aacecf119dda0fcf26d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24a55c80aacecf119dda0fcf26"`,
    );
    await queryRunner.query(`DROP TABLE "opportunity_audit_log"`);
  }
}
