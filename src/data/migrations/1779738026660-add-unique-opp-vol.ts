import { MigrationInterface, QueryRunner } from "typeorm";

// Remove rows that would violate the new UNIQUE (opportunity_id, volunteer_id)
// constraint, keeping exactly one row per pair. A single ranking expresses both
// rules: prefer the matched row when statuses differ, otherwise keep the latest.
//   1. status = 'opp-matched' first (so a differing-status group keeps the matched one)
//   2. then most recently created, then highest id (so a same-status group keeps the latest)
const sqlDedupe = `
DELETE FROM opportunity_volunteer
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY opportunity_id, volunteer_id
        ORDER BY (status::text = 'opp-matched') DESC, created_at DESC, id DESC
      ) AS rn
    FROM opportunity_volunteer
  ) ranked
  WHERE rn > 1
);
`;

export class AddUniqueOppVol1779738026660 implements MigrationInterface {
  name = "AddUniqueOppVol1779738026660";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sqlDedupe);
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ADD CONSTRAINT "UQ_ef61e09ab1a57be86168bd83378" UNIQUE ("opportunity_id", "volunteer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" DROP CONSTRAINT "UQ_ef61e09ab1a57be86168bd83378"`,
    );
  }
}
