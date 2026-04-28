import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
-- Prerequisites (idempotent — safe to run even if BE PRs #412/#414 already migrated):
ALTER TYPE public.opportunity_status_enum ADD VALUE IF NOT EXISTS 'opp-inactive';
ALTER TYPE public.volunteer_status_match_enum ADD VALUE IF NOT EXISTS 'vol-past';
ALTER TABLE public.opportunity ADD COLUMN IF NOT EXISTS "status_match"
  public.volunteer_status_match_enum NOT NULL DEFAULT 'vol-no-matches';
`;

export class AddMissingValuesToEnums1777383134500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(sql);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
