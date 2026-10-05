import { MigrationInterface, QueryRunner } from "typeorm";

// Recompute volunteer.status_match and opportunity.status_match from the
// current opportunity_volunteer rows (be#1106). Both had drifted: links created
// by earlier raw-SQL migrations never fired the recompute (volunteers never got
// a backfill like 1781600000000 did for opportunities), unlink routes skipped
// it before #812, and the old fire-and-forget entity hooks raced their own
// transaction.
//
// Mirrors resolveVolunteerMatchStatus / resolveOpportunityMatchStatus:
//   any matched / active link             →  matched
//   any pending link (no matched/active)  →  pending-match
//   otherwise, current != no-matches      →  needs-rematch
//   otherwise                             →  no-matches
//
// Rows in states the resolvers never produce (vol-past, opp-vol-past,
// opp-vol-unmatched) are left alone — they're set by other flows.

const backfill = (
  table: "volunteer" | "opportunity",
  prefix: "vol" | "opp-vol",
  enumType: string,
  skip: string[],
) => `
WITH computed AS (
  SELECT
    t.id,
    CASE
      WHEN bool_or(ov.status IN ('opp-matched', 'opp-active'))
        THEN '${prefix}-matched'
      WHEN bool_or(ov.status = 'opp-pending')
        THEN '${prefix}-pending-match'
      WHEN t.status_match::text <> '${prefix}-no-matches'
        THEN '${prefix}-needs-rematch'
      ELSE '${prefix}-no-matches'
    END AS new_status
  FROM ${table} t
  LEFT JOIN opportunity_volunteer ov ON ov.${table}_id = t.id
  WHERE t.status_match::text NOT IN (${skip.map((s) => `'${s}'`).join(", ")})
  GROUP BY t.id
)
UPDATE ${table}
SET status_match = computed.new_status::"${enumType}"
FROM computed
WHERE ${table}.id = computed.id
  AND ${table}.status_match::text <> computed.new_status;
`;

export class BackfillStatusMatch1791198309725 implements MigrationInterface {
  name = "BackfillStatusMatch1791198309725";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      backfill("volunteer", "vol", "volunteer_status_match_enum", ["vol-past"]),
    );
    await queryRunner.query(
      backfill("opportunity", "opp-vol", "opportunity_status_match_enum", [
        "opp-vol-past",
        "opp-vol-unmatched",
      ]),
    );
  }

  // Data correction only — the previous (stale) values aren't recoverable and
  // aren't worth restoring.
  public async down(): Promise<void> {}
}
