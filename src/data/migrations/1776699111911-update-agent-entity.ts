import { MigrationInterface, QueryRunner } from "typeorm";
import { titleOrphanageAgent } from "../../config";

export class UpdateAgentEntity1776699111911 implements MigrationInterface {
  name = "UpdateAgentEntity1776699111911";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_6aac19005cea8e2119cbe7759e8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_volunteer_status_engagement"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_volunteer_status_type"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "personId"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_a4cee7e601d219733b064431fba" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    const sql = `INSERT INTO agent (title, info)
            VALUES ('${titleOrphanageAgent}','The dummy agent account for parenting orphaned opportunities.')
            ON CONFLICT (title) DO NOTHING;`;
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_a4cee7e601d219733b064431fba"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "personId" integer`);
    await queryRunner.query(
      `CREATE INDEX "idx_volunteer_status_type" ON "volunteer" ("status_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_volunteer_status_engagement" ON "volunteer" ("status_engagement") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_6aac19005cea8e2119cbe7759e8" FOREIGN KEY ("personId") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
