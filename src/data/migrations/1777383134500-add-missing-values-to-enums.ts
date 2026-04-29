import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingValuesToEnums1777383134500
  implements MigrationInterface
{
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE public.opportunity_status_enum ADD VALUE IF NOT EXISTS 'opp-inactive'`,
    );
    await queryRunner.query(
      `ALTER TYPE public.volunteer_status_match_enum ADD VALUE IF NOT EXISTS 'vol-past'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
