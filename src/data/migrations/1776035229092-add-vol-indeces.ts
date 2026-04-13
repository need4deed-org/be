import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolIndeces1776035229092 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Simple btree indexes for direct filter columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_volunteer_status_engagement"
      ON "volunteer" ("status_engagement")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_volunteer_status_type"
      ON "volunteer" ("status_type")
    `);

    // GIN index for full-text search on person
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_person_search_gin"
      ON "person"
      USING GIN (
        to_tsvector(
          'simple',
          COALESCE("first_name", '') || ' ' ||
          COALESCE("last_name", '')  || ' ' ||
          COALESCE("email", '')
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_volunteer_status_engagement"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_volunteer_status_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_person_search_gin"`);
  }
}
