import {
  ApiStatisticsGet,
  ApiStatisticsGroup,
  ApiStatisticsPeriod,
  ApiStatisticsQuery,
  EntityTableName,
  OpportunityType,
  OptionTitle,
  ProfileVolunteeringType,
  STATISTICS_TOTAL_KEY,
  STATISTICS_UNKNOWN_KEY,
  StatisticsGranularity,
  StatisticsGroupBy,
  StatisticsMetric,
} from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import { LEAD_FROM_METRIC } from "../../../data/entity/statistics-event.entity";
import { getTranslationFkColumn } from "../../../services/translation/registry";

const LOCAL_TIME_ZONE = "Europe/Berlin";
const MAX_PERIODS = 1000;

const STEP: Record<StatisticsGranularity, string> = {
  [StatisticsGranularity.MONTH]: "1 month",
  [StatisticsGranularity.QUARTER]: "3 months",
  [StatisticsGranularity.YEAR]: "1 year",
};

const PERIOD_FORMAT: Record<StatisticsGranularity, string> = {
  [StatisticsGranularity.MONTH]: "YYYY-MM",
  [StatisticsGranularity.QUARTER]: 'YYYY-"Q"Q',
  [StatisticsGranularity.YEAR]: "YYYY",
};

const TOTAL_TITLE: OptionTitle = { en: "Total", de: "Gesamt" };
const UNKNOWN_TITLE: OptionTitle = { en: "Unknown", de: "Unbekannt" };

const VOLUNTEERING_TYPE_TITLE: Record<ProfileVolunteeringType, OptionTitle> = {
  [ProfileVolunteeringType.ACCOMPANYING]: {
    en: "Accompanying",
    de: "Begleitend",
  },
  [ProfileVolunteeringType.REGULAR]: { en: "Regular", de: "Regelmäßig" },
  [ProfileVolunteeringType.EVENTS]: { en: "Events", de: "Veranstaltungen" },
  [ProfileVolunteeringType.REGULAR_ACCOMPANYING]: {
    en: "Regular + Accompanying",
    de: "Regelmäßig + Begleitend",
  },
};

interface MetricSource {
  allowedGroupBy: StatisticsGroupBy[];
  sql: (groupBy: StatisticsGroupBy) => string;
}

const METRICS: Record<StatisticsMetric, MetricSource> = {
  [StatisticsMetric.NEW_VOLUNTEERS]: {
    allowedGroupBy: [
      StatisticsGroupBy.NONE,
      StatisticsGroupBy.VOLUNTEER_TYPE,
      StatisticsGroupBy.DISTRICT,
    ],
    sql: (groupBy) =>
      groupBy === StatisticsGroupBy.DISTRICT
        ? `SELECT v.id AS record_id, v.created_at AS at, dd.district_id::text AS key
           FROM volunteer v LEFT JOIN deal_district dd ON dd.deal_id = v.deal_id`
        : `SELECT v.id AS record_id, v.created_at AS at, ${
            groupBy === StatisticsGroupBy.VOLUNTEER_TYPE
              ? "v.status_type::text"
              : `'${STATISTICS_TOTAL_KEY}'`
          } AS key FROM volunteer v`,
  },
  [StatisticsMetric.REQUESTS]: {
    allowedGroupBy: [
      StatisticsGroupBy.NONE,
      StatisticsGroupBy.OPPORTUNITY_TYPE,
      StatisticsGroupBy.DISTRICT,
    ],
    sql: (groupBy) =>
      `SELECT o.id AS record_id, o.created_at AS at, ${
        {
          [StatisticsGroupBy.OPPORTUNITY_TYPE]: "o.type::text",
          [StatisticsGroupBy.DISTRICT]: "o.district_id::text",
        }[groupBy as string] ?? `'${STATISTICS_TOTAL_KEY}'`
      } AS key FROM opportunity o`,
  },
  [StatisticsMetric.LEAD_FROM]: {
    allowedGroupBy: [StatisticsGroupBy.NONE, StatisticsGroupBy.LEAD_FROM],
    sql: (groupBy) =>
      `SELECT se.id AS record_id, se.occurred_at AS at, ${
        groupBy === StatisticsGroupBy.LEAD_FROM
          ? "se.value_key"
          : `'${STATISTICS_TOTAL_KEY}'`
      } AS key FROM statistics_event se WHERE se.metric = '${LEAD_FROM_METRIC}'`,
  },
};

// Columns are `timestamp` holding the session time zone's wall time.
const localSource = (sql: string) =>
  `WITH src AS (${sql}),
   local AS (
     SELECT record_id, key,
       (at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE '${LOCAL_TIME_ZONE}' AS local_at
     FROM src
   )`;

async function getLeadFromGroups(): Promise<ApiStatisticsGroup[]> {
  const fk = getTranslationFkColumn(EntityTableName.LEAD);
  const rows: { id: number; title: string; iso: string | null; t: string }[] =
    await dataSource.query(
      `SELECT lf.id, lf.title, l.iso_code AS iso, ft.translation AS t
       FROM lead_from lf
       LEFT JOIN field_translation ft ON ft.${fk} = lf.id AND ft.field_name = 'title'
       LEFT JOIN language l ON l.id = ft.language_id
       ORDER BY lf.id`,
    );
  const groups = new Map<number, ApiStatisticsGroup>();
  for (const row of rows) {
    const group = groups.get(row.id) ?? {
      key: String(row.id),
      title: { de: row.title },
    };
    if (row.iso) {
      group.title[row.iso as keyof OptionTitle] = row.t;
    }
    groups.set(row.id, group);
  }
  return [...groups.values()];
}

async function getGroups(
  groupBy: StatisticsGroupBy,
): Promise<ApiStatisticsGroup[]> {
  switch (groupBy) {
    case StatisticsGroupBy.NONE:
      return [{ key: STATISTICS_TOTAL_KEY, title: TOTAL_TITLE }];
    case StatisticsGroupBy.VOLUNTEER_TYPE:
      return Object.values(ProfileVolunteeringType).map((key) => ({
        key,
        title: VOLUNTEERING_TYPE_TITLE[key],
      }));
    case StatisticsGroupBy.OPPORTUNITY_TYPE:
      return Object.values(OpportunityType).map((key) => ({
        key,
        title: VOLUNTEERING_TYPE_TITLE[key],
      }));
    case StatisticsGroupBy.DISTRICT: {
      const districts: { id: number; title: string }[] = await dataSource.query(
        "SELECT id, title FROM district ORDER BY id",
      );
      return districts.map(({ id, title }) => ({
        key: String(id),
        title: { en: title, de: title },
      }));
    }
    case StatisticsGroupBy.LEAD_FROM:
      return getLeadFromGroups();
  }
}

async function getTotalsBeforeTracking(): Promise<Record<string, number>> {
  const rows: { key: string; count: number }[] = await dataSource.query(
    `SELECT lf.id::text AS key, GREATEST(lf.count - COUNT(se.id), 0)::int AS count
     FROM lead_from lf
     LEFT JOIN statistics_event se ON se.metric = $1 AND se.value_key = lf.id::text
     GROUP BY lf.id ORDER BY lf.id`,
    [LEAD_FROM_METRIC],
  );
  return Object.fromEntries(rows.map(({ key, count }) => [key, count]));
}

export async function getStatistics(
  metric: StatisticsMetric,
  {
    granularity,
    from,
    to,
    groupBy = StatisticsGroupBy.NONE,
  }: ApiStatisticsQuery,
): Promise<ApiStatisticsGet> {
  const { allowedGroupBy, sql } = METRICS[metric];
  if (!allowedGroupBy.includes(groupBy)) {
    throw new BadRequestError(
      `Metric "${metric}" cannot be grouped by "${groupBy}".`,
    );
  }
  if (from && to && from >= to) {
    throw new BadRequestError(`"from" must be before "to".`);
  }

  const source = localSource(sql(groupBy));
  const nowLocal = `(now() AT TIME ZONE '${LOCAL_TIME_ZONE}')`;
  const [range]: { fromLocal: Date; toLocal: Date }[] = await dataSource.query(
    `${source}
     SELECT
       date_trunc($1, COALESCE($2::timestamp, (SELECT min(local_at) FROM local), ${nowLocal})) AS "fromLocal",
       date_trunc($1, COALESCE($3::timestamp - interval '1 microsecond', ${nowLocal})) + $4::interval AS "toLocal"`,
    [granularity, from ?? null, to ?? null, STEP[granularity]],
  );

  const periodRows: { period: string; start: Date }[] = await dataSource.query(
    `SELECT to_char(s, $1) AS period, s AT TIME ZONE '${LOCAL_TIME_ZONE}' AS start
     FROM generate_series($2::timestamp, $3::timestamp - interval '1 microsecond', $4::interval) s
     ORDER BY s
     LIMIT ${MAX_PERIODS + 1}`,
    [
      PERIOD_FORMAT[granularity],
      range.fromLocal,
      range.toLocal,
      STEP[granularity],
    ],
  );
  if (periodRows.length > MAX_PERIODS) {
    throw new BadRequestError(
      `Range spans more than ${MAX_PERIODS} periods; narrow it or use a coarser granularity.`,
    );
  }

  const countRows: {
    period: string;
    key: string | null;
    isTotal: boolean;
    count: number;
  }[] = await dataSource.query(
    `${source}
     SELECT to_char(date_trunc($1, local_at), $2) AS period,
       COALESCE(key, '${STATISTICS_UNKNOWN_KEY}') AS key,
       GROUPING(key) = 1 AS "isTotal",
       COUNT(DISTINCT record_id)::int AS count
     FROM local
     WHERE local_at >= $3 AND local_at < $4
     GROUP BY GROUPING SETS ((1, key), (1))`,
    [granularity, PERIOD_FORMAT[granularity], range.fromLocal, range.toLocal],
  );

  const groups = await getGroups(groupBy);
  const knownKeys = new Set(groups.map(({ key }) => key));
  const periods = new Map<string, ApiStatisticsPeriod>(
    periodRows.map(({ period, start }) => [
      period,
      { period, start, counts: {}, total: 0 },
    ]),
  );
  for (const { period, key, isTotal, count } of countRows) {
    const entry = periods.get(period);
    if (!entry) {
      continue;
    }
    if (isTotal) {
      entry.total = count;
      continue;
    }
    const groupKey = key && knownKeys.has(key) ? key : STATISTICS_UNKNOWN_KEY;
    entry.counts[groupKey] = (entry.counts[groupKey] ?? 0) + count;
  }

  const hasUnknown = [...periods.values()].some(
    ({ counts }) => STATISTICS_UNKNOWN_KEY in counts,
  );

  return {
    metric,
    granularity,
    groupBy,
    allowedGroupBy,
    groups: hasUnknown
      ? [...groups, { key: STATISTICS_UNKNOWN_KEY, title: UNKNOWN_TITLE }]
      : groups,
    periods: [...periods.values()],
    ...(metric === StatisticsMetric.LEAD_FROM
      ? { totalsBeforeTracking: await getTotalsBeforeTracking() }
      : {}),
  };
}
