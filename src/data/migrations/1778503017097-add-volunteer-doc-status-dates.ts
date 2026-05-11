import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
ALTER TABLE public.volunteer
  ADD COLUMN IF NOT EXISTS status_vaccination_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status_cgc_application_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status_cgc_date TIMESTAMP;

-- Backfill: volunteers who had a CGC process status → application date 01.04.2026
UPDATE public.volunteer
SET status_cgc_application_date = '2026-04-01'
WHERE status_cgc_process IS NOT NULL
  AND status_cgc_application_date IS NULL;

-- Backfill: volunteers with confirmed vaccination → vaccination date 01.04.2026
UPDATE public.volunteer
SET status_vaccination_date = '2026-04-01'
WHERE status_vaccination = 'yes'
  AND status_vaccination_date IS NULL;

-- Backfill: volunteers with CGC confirmed or applied → CGC date 01.04.2026
UPDATE public.volunteer
SET status_cgc_date = '2026-04-01'
WHERE status_cgc IN ('yes', 'applied_n4d')
  AND status_cgc_date IS NULL;
`;

const revert = `
ALTER TABLE public.volunteer
  DROP COLUMN IF EXISTS status_vaccination_date,
  DROP COLUMN IF EXISTS status_cgc_application_date,
  DROP COLUMN IF EXISTS status_cgc_date;
`;

export class AddVolunteerDocStatusDates1778503017097
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(revert);
  }
}
