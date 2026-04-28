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
    await queryRunner.query(
      `ALTER TABLE public.opportunity ADD COLUMN IF NOT EXISTS "status_match" public.volunteer_status_match_enum NOT NULL DEFAULT 'vol-no-matches'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
