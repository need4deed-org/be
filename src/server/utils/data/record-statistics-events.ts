import {
  OpportunityStatusType,
  StatisticsMetric,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { berlinTimeZone } from "../../../config";

export const OPPORTUNITY_STATUS_METRICS: {
  metric: StatisticsMetric;
  statuses: OpportunityStatusType[];
}[] = [
  {
    metric: StatisticsMetric.PAST_OPPORTUNITIES,
    statuses: [OpportunityStatusType.PAST],
  },
  {
    metric: StatisticsMetric.VALIDATED_OPPORTUNITIES,
    statuses: [
      OpportunityStatusType.SEARCHING,
      OpportunityStatusType.ACTIVE,
      OpportunityStatusType.PAST,
    ],
  },
];

export const VOLUNTEER_SNAPSHOT_METRICS: {
  metric: StatisticsMetric;
  status: VolunteerStateEngagementType;
}[] = [
  {
    metric: StatisticsMetric.ACTIVE_VOLUNTEERS,
    status: VolunteerStateEngagementType.ACTIVE,
  },
  {
    metric: StatisticsMetric.AVAILABLE_VOLUNTEERS,
    status: VolunteerStateEngagementType.AVAILABLE,
  },
];

// Later in the month a catch-up snapshot would describe a different month.
export const SNAPSHOT_CATCH_UP_DAYS = 3;

export const SNAPSHOT_KEY_SEPARATOR = "#";

export const atBerlin = (value: string) =>
  `(${value}) AT TIME ZONE '${berlinTimeZone}'`;

export async function recordOpportunityStatusEvents(
  manager: EntityManager,
  at: Date = new Date(),
  opportunityIds?: number[],
): Promise<Record<string, number>> {
  const recorded: Record<string, number> = {};
  for (const { metric, statuses } of OPPORTUNITY_STATUS_METRICS) {
    const rows: unknown[] = await manager.query(
      `INSERT INTO statistics_event
         (metric, occurred_at, value_key, district_id, opportunity_type)
       SELECT $1::varchar, LEAST(o.updated_at, $2::timestamptz), o.id::text,
         COALESCE(o.district_id, CASE WHEN o.address_id IS NULL THEN a.district_id END),
         o.type::text
       FROM opportunity o
       LEFT JOIN agent a ON a.id = o.agent_id
       WHERE o.status::text = ANY($3::text[])
         AND ($4::int[] IS NULL OR o.id = ANY($4))
         AND NOT EXISTS (
           SELECT 1 FROM statistics_event se
           WHERE se.metric = $1 AND se.value_key = o.id::text
         )
       RETURNING id`,
      [metric, at, statuses, opportunityIds ?? null],
    );
    recorded[metric] = rows.length;
  }
  return recorded;
}

// Anonymous on purpose: no volunteer id, only a random number within the snapshot.
export async function recordVolunteerSnapshots(
  manager: EntityManager,
  at: Date = new Date(),
  volunteerIds?: number[],
): Promise<Record<string, number>> {
  const recorded: Record<string, number> = {};
  for (const { metric, status } of VOLUNTEER_SNAPSHOT_METRICS) {
    const rows: unknown[] = await manager.query(
      `WITH bounds AS (
         SELECT date_trunc('month', ${atBerlin("$2::timestamptz")}) AS month_start,
           extract(day FROM ${atBerlin("$2::timestamptz")}) AS day
       ),
       snapshot AS (
         SELECT v.deal_id, COALESCE(v.status_type::text, '') || '${SNAPSHOT_KEY_SEPARATOR}'
           || row_number() OVER (ORDER BY random()) AS value_key
         FROM volunteer v
         WHERE v.status_engagement::text = $3
           AND ($4::int[] IS NULL OR v.id = ANY($4))
       )
       INSERT INTO statistics_event (metric, occurred_at, value_key, district_id)
       SELECT $1::varchar, ${atBerlin("b.month_start")} - interval '1 millisecond',
         s.value_key, dd.district_id
       FROM bounds b
       CROSS JOIN snapshot s
       LEFT JOIN deal_district dd ON dd.deal_id = s.deal_id
       WHERE b.day <= ${SNAPSHOT_CATCH_UP_DAYS}
         AND NOT EXISTS (
           SELECT 1 FROM statistics_event se
           WHERE se.metric = $1
             AND se.occurred_at >= ${atBerlin("b.month_start - interval '1 month'")}
             AND se.occurred_at < ${atBerlin("b.month_start")}
         )
       RETURNING id`,
      [metric, at, status, volunteerIds ?? null],
    );
    recorded[metric] = rows.length;
  }
  return recorded;
}
