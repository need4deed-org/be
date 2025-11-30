import { MigrationInterface, QueryRunner } from "typeorm";

// Create the unique index required for CONCURRENT refreshing
export class CreateMvUniqueIndex1763036250588 implements MigrationInterface {
  name = "CreateMvUniqueIndex1763036250588";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX mv_volunteer_id_unique_idx ON volunteer_list_mv (volunteer_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX mv_volunteer_id_unique_idx;`);
  }
}
