import { MigrationInterface, QueryRunner } from "typeorm";

// Backfill opportunity.status_match from the current opportunity_volunteer rows.
// Prior to this migration the column was never written to after its initial
// default ('opp-vol-no-matches'), so every opportunity appeared unmatched even
// when volunteers were already linked.
//
// Logic mirrors resolveOpportunityMatchStatus:
//   any opp-matched / opp-active link  →  opp-vol-matched
//   any opp-pending link (no match)    →  opp-vol-pending-match
//   anything else                      →  opp-vol-no-matches  (leave as-is)
//
// The NEEDS_REMATCH case (currentStatus !== NO_MATCHES) is intentionally
// skipped: every opportunity currently has the default NO_MATCHES, so there is
// no "previous" status to transition from.

const sqlBackfill = `
WITH computed AS (
  SELECT
    o.id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM opportunity_volunteer ov
        WHERE ov.opportunity_id = o.id
          AND ov.status IN ('opp-matched', 'opp-active')
      ) THEN 'opp-vol-matched'
      WHEN EXISTS (
        SELECT 1 FROM opportunity_volunteer ov
        WHERE ov.opportunity_id = o.id
          AND ov.status = 'opp-pending'
      ) THEN 'opp-vol-pending-match'
      ELSE 'opp-vol-no-matches'
    END AS new_status
  FROM opportunity o
)
UPDATE opportunity
SET status_match = computed.new_status::"opportunity_status_match_enum"
FROM computed
WHERE opportunity.id = computed.id
  AND opportunity.status_match::text != computed.new_status;
`;

export class BackfillOpportunityStatusMatch1781600000000
  implements MigrationInterface
{
  name = "BackfillOpportunityStatusMatch1781600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(sqlBackfill);
  }

  // Resets all opportunities back to the pre-migration default.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE opportunity SET status_match = 'opp-vol-no-matches'`,
    );
  }
}
