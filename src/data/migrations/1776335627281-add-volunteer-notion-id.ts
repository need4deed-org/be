import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerNotionId1776335627281 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE volunteer ADD COLUMN IF NOT EXISTS notion_id VARCHAR(50)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_volunteer_notion_id ON volunteer (notion_id)`,
    );

    // Partial backfill: volunteers that have at least one opportunity link in
    // notion_relation can be resolved immediately without any external call.
    // Volunteers with no opportunity links are backfilled by the
    // migrate-notion script, which uses the seed JSON (nid + email).
    await queryRunner.query(`
      UPDATE volunteer v
      SET notion_id = sub.tenant_nid
      FROM (
        SELECT DISTINCT ON (ov.volunteer_id)
          ov.volunteer_id,
          nr.tenant_nid
        FROM notion_relation nr
        JOIN opportunity_volunteer ov ON ov.opportunity_id = nr.host_id
        WHERE nr.tenant_type = 'volunteer'
          AND nr.host_type = 'opportunity'
        ORDER BY ov.volunteer_id
      ) sub
      WHERE v.id = sub.volunteer_id
        AND v.notion_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_volunteer_notion_id`);
    await queryRunner.query(
      `ALTER TABLE volunteer DROP COLUMN IF EXISTS notion_id`,
    );
  }
}
