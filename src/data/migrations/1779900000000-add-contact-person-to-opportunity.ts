import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContactPersonToOpportunity1779900000000
  implements MigrationInterface
{
  name = "AddContactPersonToOpportunity1779900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE opportunity
      ADD COLUMN IF NOT EXISTS contact_person_id integer
      REFERENCES person(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE opportunity DROP COLUMN IF EXISTS contact_person_id
    `);
  }
}
