import {
  ApiStatisticsGet,
  ApiStatisticsGroup,
  ApiStatisticsPeriod,
  ApiStatisticsQuery,
  EntityTableName,
  Lang,
  OpportunityType,
  OptionTitle,
  ProfileVolunteeringType,
  STATISTICS_TOTAL_KEY,
  STATISTICS_UNKNOWN_KEY,
  StatisticsGranularity,
  StatisticsGroupBy,
  StatisticsMetric,
} from "need4deed-sdk";
import { BadRequestError, berlinTimeZone } from "../../../config";
import { dataSource } from "../../../data/data-source";
import { LEAD_FROM_METRIC } from "../../../data/entity/statistics-event.entity";
import { getTranslationFkColumn } from "../../../services/translation/registry";

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
  from: string;
  counted?: string;
  at: string;
  filter?: string;
  exclude?: string;
  keys: Partial<Record<StatisticsGroupBy, { join?: string; key: string }>>;
}

const TOTAL_KEY_SQL = { key: `'${STATISTICS_TOTAL_KEY}'` };

const METRICS: Record<StatisticsMetric, MetricSource> = {
  [StatisticsMetric.NEW_VOLUNTEERS]: {
    from: "volunteer r",
    counted: `(
      SELECT v.*, NULLIF(p.email, '') IS NOT NULL AND row_number() OVER (
        PARTITION BY lower(NULLIF(p.email, '')) ORDER BY v.created_at, v.id
      ) > 1 AS is_repeat
      FROM volunteer v JOIN person p ON p.id = v.person_id
    ) r`,
    at: "r.created_at",
    exclude: "r.is_repeat",
    keys: {
      [StatisticsGroupBy.NONE]: TOTAL_KEY_SQL,
      [StatisticsGroupBy.VOLUNTEER_TYPE]: { key: "r.status_type::text" },
      [StatisticsGroupBy.DISTRICT]: {
        join: `LEFT JOIN deal_district dd ON dd.deal_id = r.deal_id
               LEFT JOIN district d ON d.id = dd.district_id`,
        key: "d.id::text",
      },
    },
  },
  [StatisticsMetric.REQUESTS]: {
    from: "opportunity r",
    at: "r.created_at",
    keys: {
      [StatisticsGroupBy.NONE]: TOTAL_KEY_SQL,
      [StatisticsGroupBy.OPPORTUNITY_TYPE]: { key: "r.type::text" },
      [StatisticsGroupBy.DISTRICT]: {
        join: `LEFT JOIN agent a ON a.id = r.agent_id
               LEFT JOIN district d ON d.id = COALESCE(r.district_id, a.district_id)`,
        key: "d.id::text",
      },
    },
  },
  [StatisticsMetric.LEAD_FROM]: {
    from: "statistics_event r",
    at: "r.occurred_at",
    filter: `r.metric = '${LEAD_FROM_METRIC}'`,
    keys: {
      [StatisticsGroupBy.NONE]: TOTAL_KEY_SQL,
      [StatisticsGroupBy.LEAD_FROM]: {
        join: "LEFT JOIN lead_from lf ON lf.id::text = r.value_key",
        key: "lf.id::text",
      },
    },
  },
};

// Columns are `timestamp` filled by the database's now(), i.e. session time zone wall time.
const toLocal = (column: string) =>
  `((${column}) AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE '${berlinTimeZone}'`;
const fromLocal = (local: string) =>
  `((${local}) AT TIME ZONE '${berlinTimeZone}') AT TIME ZONE current_setting('TimeZone')`;

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
      title: { en: row.title, de: row.title },
    };
    if ((row.iso === Lang.EN || row.iso === Lang.DE) && row.t) {
      group.title[row.iso] = row.t;
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
  const source = METRICS[metric];
  const allowedGroupBy = Object.keys(source.keys) as StatisticsGroupBy[];
  const groupKey = source.keys[groupBy];
  if (!groupKey) {
    throw new BadRequestError(
      `Metric "${metric}" cannot be grouped by "${groupBy}".`,
    );
  }

  if (from && to && from >= to) {
    throw new BadRequestError(`"from" must be before "to".`);
  }

  const filter = source.filter ? `AND ${source.filter}` : "";
  const exclude = source.exclude ? `AND NOT ${source.exclude}` : "";
  const nowLocal = `(now() AT TIME ZONE '${berlinTimeZone}')`;
  const [range]: { fromLocal: string; toLocal: string; periodCount: number }[] =
    await dataSource.query(
      `WITH bounds AS (
         SELECT
           date_trunc($1, COALESCE(
             $2::timestamp,
             LEAST(
               (SELECT ${toLocal(`min(${source.at})`)} FROM ${source.from} WHERE TRUE ${filter}),
               $3::timestamp - interval '1 microsecond'
             ),
             ${nowLocal}
           )) AS from_local,
           date_trunc($1, COALESCE($3::timestamp - interval '1 microsecond', ${nowLocal})) + $4::interval AS to_local
       )
       SELECT from_local::text AS "fromLocal", to_local::text AS "toLocal",
         (SELECT count(*)::int FROM (
           SELECT 1 FROM generate_series(from_local, to_local - interval '1 microsecond', $4::interval)
           LIMIT ${MAX_PERIODS + 1}
         ) s) AS "periodCount"
       FROM bounds`,
      [granularity, from ?? null, to ?? null, STEP[granularity]],
    );
  if (!range.periodCount) {
    throw new BadRequestError(`The range from "from" to "to" is empty.`);
  }
  if (range.periodCount > MAX_PERIODS) {
    throw new BadRequestError(
      `Range spans more than ${MAX_PERIODS} periods; narrow it or use a coarser granularity.`,
    );
  }

  const rowsQuery: Promise<
    {
      period: string;
      start: Date;
      key: string | null;
      isTotal: boolean | null;
      count: number | null;
    }[]
  > = dataSource.query(
    `WITH src AS (
       SELECT r.id AS record_id, ${toLocal(source.at)} AS local_at, ${groupKey.key} AS key
       FROM ${source.counted ?? source.from} ${groupKey.join ?? ""}
       WHERE ${source.at} >= ${fromLocal("$2::timestamp")}
         AND ${source.at} < ${fromLocal("$3::timestamp")} ${filter} ${exclude}
     ),
     counts AS (
       SELECT date_trunc($1, local_at) AS bucket,
         COALESCE(key, '${STATISTICS_UNKNOWN_KEY}') AS key,
         GROUPING(key) = 1 AS is_total,
         COUNT(DISTINCT record_id)::int AS count
       FROM src
       GROUP BY GROUPING SETS ((1, key), (1))
     )
     SELECT to_char(s, $5) AS period, s AT TIME ZONE '${berlinTimeZone}' AS start,
       c.key, c.is_total AS "isTotal", c.count
     FROM generate_series($2::timestamp, $3::timestamp - interval '1 microsecond', $4::interval) s
     LEFT JOIN counts c ON c.bucket = s
     ORDER BY s`,
    [
      granularity,
      range.fromLocal,
      range.toLocal,
      STEP[granularity],
      PERIOD_FORMAT[granularity],
    ],
  );
  const [rows, groups, totalsBeforeTracking] = await Promise.all([
    rowsQuery,
    getGroups(groupBy),
    groupBy === StatisticsGroupBy.LEAD_FROM
      ? getTotalsBeforeTracking()
      : undefined,
  ]);

  const periods = new Map<string, ApiStatisticsPeriod>();
  for (const { period, start, key, isTotal, count } of rows) {
    const entry = periods.get(period) ?? {
      period,
      start,
      counts: {},
      total: 0,
    };
    periods.set(period, entry);
    if (count === null) {
      continue;
    }
    if (isTotal) {
      entry.total = count;
      continue;
    }
    entry.counts[key ?? STATISTICS_UNKNOWN_KEY] = count;
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
    ...(totalsBeforeTracking ? { totalsBeforeTracking } : {}),
  };
}
