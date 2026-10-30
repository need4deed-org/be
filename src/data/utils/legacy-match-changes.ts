import { QueryRunner } from "typeorm";

export type LegacyMatchChange = [
  volunteerId: number,
  opportunityId: number,
  from: string,
  to: string,
  matchedOn?: string,
];

const recomputeStatusMatch = (
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
  WHERE t.id = ANY($1)
    AND t.status_match::text NOT IN (${skip.map((s) => `'${s}'`).join(", ")})
  GROUP BY t.id
)
UPDATE ${table}
SET status_match = computed.new_status::"${enumType}"
FROM computed
WHERE ${table}.id = computed.id
  AND ${table}.status_match::text <> computed.new_status;
`;

async function recomputeMatchStatuses(
  queryRunner: QueryRunner,
  volunteerIds: number[],
  opportunityIds: number[],
): Promise<void> {
  await queryRunner.query(
    recomputeStatusMatch("volunteer", "vol", "volunteer_status_match_enum", [
      "vol-past",
    ]),
    [volunteerIds],
  );
  await queryRunner.query(
    recomputeStatusMatch(
      "opportunity",
      "opp-vol",
      "opportunity_status_match_enum",
      ["opp-vol-past", "opp-vol-unmatched"],
    ),
    [opportunityIds],
  );
}

const CHANGES_RECORDSET = `jsonb_to_recordset($1::jsonb) AS c(
  "volunteerId" int, "opportunityId" int, "from" text, "to" text, "matchedOn" date
)`;

interface SkippedRow {
  volunteerId: number;
  opportunityId: number;
  status: string | null;
  to: string;
}

export async function applyLegacyMatchChanges(
  queryRunner: QueryRunner,
  changes: LegacyMatchChange[],
): Promise<{ changed: number; skipped: string[] }> {
  const recordset = JSON.stringify(
    changes.map(([volunteerId, opportunityId, from, to, matchedOn]) => ({
      volunteerId,
      opportunityId,
      from,
      to,
      matchedOn: matchedOn ?? null,
    })),
  );

  const skippedRows: SkippedRow[] = await queryRunner.query(
    `SELECT c."volunteerId", c."opportunityId", ov.status::text AS status, c."to"
       FROM ${CHANGES_RECORDSET}
       LEFT JOIN opportunity_volunteer ov
         ON ov.volunteer_id = c."volunteerId" AND ov.opportunity_id = c."opportunityId"
      WHERE ov.id IS NULL OR ov.status::text <> c."from"`,
    [recordset],
  );

  await queryRunner.query(
    `WITH target AS (
       SELECT ov.id, c."to", c."matchedOn" IS NOT NULL AS dated,
              COALESCE(c."matchedOn" + time '12:00', GREATEST(o.created_at, v.created_at)) AS changed_on
         FROM ${CHANGES_RECORDSET}
         JOIN opportunity_volunteer ov
           ON ov.volunteer_id = c."volunteerId" AND ov.opportunity_id = c."opportunityId"
          AND ov.status::text = c."from"
         JOIN opportunity o ON o.id = ov.opportunity_id
         JOIN volunteer v ON v.id = ov.volunteer_id
     )
     UPDATE opportunity_volunteer ov
        SET status = target."to"::opportunity_volunteer_status_enum,
            created_at = CASE WHEN target.dated THEN target.changed_on
                              ELSE LEAST(ov.created_at, target.changed_on) END,
            updated_at = target.changed_on
       FROM target
      WHERE ov.id = target.id`,
    [recordset],
  );

  const skippedPairs = new Set(
    skippedRows.map((row) => `${row.volunteerId}/${row.opportunityId}`),
  );
  const changedPairs = changes.filter(
    ([volunteerId, opportunityId]) =>
      !skippedPairs.has(`${volunteerId}/${opportunityId}`),
  );
  await recomputeMatchStatuses(
    queryRunner,
    changedPairs.map(([volunteerId]) => volunteerId),
    changedPairs.map(([, opportunityId]) => opportunityId),
  );

  return {
    changed: changedPairs.length,
    skipped: skippedRows.map(
      ({ volunteerId, opportunityId, status, to }) =>
        `${volunteerId}/${opportunityId}:${status === null ? "missing" : status === to ? "already-done" : status}`,
    ),
  };
}
