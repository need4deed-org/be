import { QueryRunner } from "typeorm";

export type LegacyMatchChange = [
  volunteerId: number,
  opportunityId: number,
  from: string,
  to: string,
  matchedOn?: string,
];

const PAST = "opp-past";
const MATCHED = "opp-matched";

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

interface MatchRow {
  id: number;
  status: string;
  createdAt: Date;
  opportunityCreatedAt: Date;
  volunteerCreatedAt: Date;
}

const latest = (...dates: Date[]) =>
  new Date(Math.max(...dates.map((d) => d.getTime())));
const earliest = (...dates: Date[]) =>
  new Date(Math.min(...dates.map((d) => d.getTime())));

export async function applyLegacyMatchChanges(
  queryRunner: QueryRunner,
  changes: LegacyMatchChange[],
): Promise<{ changed: number; skipped: string[] }> {
  const skipped: string[] = [];
  let changed = 0;
  const volunteerIds = new Set<number>();
  const opportunityIds = new Set<number>();

  for (const [volunteerId, opportunityId, from, to, matchedOn] of changes) {
    const [row]: MatchRow[] = await queryRunner.query(
      `SELECT ov.id, ov.status, ov.created_at AS "createdAt",
              o.created_at AS "opportunityCreatedAt",
              v.created_at AS "volunteerCreatedAt"
         FROM opportunity_volunteer ov
         JOIN opportunity o ON o.id = ov.opportunity_id
         JOIN volunteer v ON v.id = ov.volunteer_id
        WHERE ov.volunteer_id = $1 AND ov.opportunity_id = $2`,
      [volunteerId, opportunityId],
    );
    if (!row || row.status !== from) {
      skipped.push(
        `${volunteerId}/${opportunityId}:${row ? row.status : "missing"}`,
      );
      continue;
    }

    const changedOn = matchedOn
      ? new Date(`${matchedOn}T12:00:00Z`)
      : latest(row.opportunityCreatedAt, row.volunteerCreatedAt);
    const matchedAt =
      to === PAST && from === MATCHED
        ? earliest(row.createdAt, changedOn)
        : changedOn;

    await queryRunner.query(
      `UPDATE opportunity_volunteer
          SET status = $2, created_at = $3, updated_at = $4
        WHERE id = $1`,
      [row.id, to, matchedAt, changedOn],
    );
    changed++;
    volunteerIds.add(volunteerId);
    opportunityIds.add(opportunityId);
  }

  await recomputeMatchStatuses(
    queryRunner,
    [...volunteerIds],
    [...opportunityIds],
  );
  return { changed, skipped };
}

export async function revertLegacyMatchChanges(
  queryRunner: QueryRunner,
  changes: LegacyMatchChange[],
): Promise<void> {
  for (const [volunteerId, opportunityId, from, to] of changes) {
    await queryRunner.query(
      `UPDATE opportunity_volunteer SET status = $3
        WHERE volunteer_id = $1 AND opportunity_id = $2 AND status = $4`,
      [volunteerId, opportunityId, from, to],
    );
  }
  await recomputeMatchStatuses(
    queryRunner,
    changes.map(([volunteerId]) => volunteerId),
    changes.map(([, opportunityId]) => opportunityId),
  );
}
