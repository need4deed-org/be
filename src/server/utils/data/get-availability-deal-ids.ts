import {
  AVAILABILITY_FILTER_SEPARATOR,
  AvailabilityFilterGroup,
  OccasionalType,
  TimeSlot,
} from "need4deed-sdk";
import { Raw } from "typeorm";
import { dataSource } from "../../../data/data-source";
import {
  ByDayCode,
  getByDayCodeExact,
  getIsoDay,
} from "../../../data/utils/by-day-code";

const OCCASIONAL_DAYS: Record<OccasionalType, ByDayCode[]> = {
  [OccasionalType.WEEKDAYS]: ["MO", "TU", "WE", "TH", "FR"],
  [OccasionalType.WEEKENDS]: ["SA", "SU"],
};
const TIME_SLOTS = new Set<string>(Object.values(TimeSlot));
const OCCASIONAL = new Set<string>(Object.values(OccasionalType));
const SERVER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOCAL_TIME_ZONE = "Europe/Berlin";
// one-time timeslot starts are absolute instants stored as server-local wall time
const ONETIME_START =
  "((t.start AT TIME ZONE :availabilityServerTimeZone) AT TIME ZONE :availabilityLocalTimeZone)";
// onetimer.date is timestamptz
const ONETIMER_START = "(ot.date AT TIME ZONE :availabilityLocalTimeZone)";
const DEAL_SLOT_SQL = (condition: string) =>
  `SELECT dt.deal_id FROM deal_timeslot dt JOIN timeslot t ON t.id = dt.timeslot_id WHERE ${condition}`;

export type AvailabilityFilter = {
  days: ByDayCode[];
  times: string[];
  occasional: OccasionalType[];
};

type Params = Record<string, unknown>;

export function parseAvailabilityFilter(
  input: string | string[] | undefined,
): AvailabilityFilter | null {
  const values = [input ?? []].flat().filter(Boolean);
  if (!values.length) {
    return null;
  }
  const filter: AvailabilityFilter = { days: [], times: [], occasional: [] };
  for (const value of values) {
    const [group, item] = value.split(AVAILABILITY_FILTER_SEPARATOR);
    const dayCode =
      group === AvailabilityFilterGroup.DAYS ? getByDayCodeExact(item) : null;
    if (dayCode) {
      filter.days.push(dayCode);
    } else if (
      group === AvailabilityFilterGroup.TIMES &&
      TIME_SLOTS.has(item)
    ) {
      filter.times.push(item);
    } else if (
      group === AvailabilityFilterGroup.OCCASIONAL &&
      OCCASIONAL.has(item)
    ) {
      filter.occasional.push(item as OccasionalType);
    }
  }
  return filter;
}

function matchingOccasionalTypes({
  days,
  times,
  occasional,
}: AvailabilityFilter): OccasionalType[] {
  return Object.values(OccasionalType).filter((type) =>
    days.length
      ? occasional.includes(type) ||
        OCCASIONAL_DAYS[type].some((day) => days.includes(day))
      : occasional.length
        ? occasional.includes(type)
        : times.length > 0,
  );
}

function getSlotDays({ days, occasional }: AvailabilityFilter): ByDayCode[] {
  return [
    ...new Set([
      ...days,
      ...occasional.flatMap((type) => OCCASIONAL_DAYS[type]),
    ]),
  ];
}

// day/time conditions on a single Berlin-local start instant
function getOnetimeConditions(
  filter: AvailabilityFilter,
  start: string,
  params: Params,
): string[] {
  const { times } = filter;
  const slotDays = getSlotDays(filter);
  const conditions: string[] = [];
  if (slotDays.length) {
    conditions.push(
      `EXTRACT(ISODOW FROM ${start}) IN (:...availabilityIsoDays)`,
    );
    params.availabilityIsoDays = slotDays.map(getIsoDay);
  }
  if (times.length) {
    conditions.push(
      `(${times
        .map((time, i) => {
          const [from, to] = time.split("-").map(Number);
          params[`availabilityFrom${i}`] = from;
          params[`availabilityTo${i}`] = to;
          return `(EXTRACT(HOUR FROM ${start}) >= :availabilityFrom${i} AND EXTRACT(HOUR FROM ${start}) < :availabilityTo${i})`;
        })
        .join(" OR ")})`,
    );
  }
  params.availabilityLocalTimeZone = LOCAL_TIME_ZONE;
  return conditions;
}

function getAvailabilityCondition(
  filter: AvailabilityFilter,
): [string, Params] {
  const { times } = filter;
  const branches: string[] = [];
  const params: Params = {};
  const slotDays = getSlotDays(filter);
  if (slotDays.length || times.length) {
    const recurring = ["t.rrule IS NOT NULL"];
    if (slotDays.length) {
      recurring.push("t.rrule ~ :availabilityDayPattern");
      params.availabilityDayPattern = `BYDAY=([^;]*,)?(${slotDays.join("|")})(,|;|$)`;
    }
    if (times.length) {
      recurring.push(
        `to_char(t.start, 'HH24') || '-' || to_char(t."end", 'HH24') IN (:...availabilityTimes)`,
      );
      params.availabilityTimes = times;
    }
    const onetime = [
      "t.rrule IS NULL",
      "t.occasional IS NULL",
      "t.start IS NOT NULL",
      ...getOnetimeConditions(filter, ONETIME_START, params),
    ];
    params.availabilityServerTimeZone = SERVER_TIME_ZONE;
    branches.push(recurring.join(" AND "), onetime.join(" AND "));
  }
  const occasionalTypes = matchingOccasionalTypes(filter);
  if (occasionalTypes.length) {
    branches.push("t.occasional::text IN (:...availabilityOccasional)");
    params.availabilityOccasional = occasionalTypes;
  }
  return [branches.map((b) => `(${b})`).join(" OR "), params];
}

function isEmptyFilter({ days, times, occasional }: AvailabilityFilter) {
  return !days.length && !times.length && !occasional.length;
}

// deal ids whose timeslots match; null when no availability filter was given
export async function findAvailabilityDealIds(
  input: string | string[] | undefined,
): Promise<number[] | null> {
  const filter = parseAvailabilityFilter(input);
  if (!filter) {
    return null;
  }
  if (isEmptyFilter(filter)) {
    return [];
  }
  const [condition, params] = getAvailabilityCondition(filter);
  const rows: { dealId: number }[] = await dataSource
    .createQueryBuilder()
    .select("DISTINCT dt.deal_id", "dealId")
    .from("deal_timeslot", "dt")
    .innerJoin("timeslot", "t", "t.id = dt.timeslot_id")
    .where(condition, params)
    .getRawMany();
  return rows.map(({ dealId }) => dealId);
}

// Deal ids of matching opportunities. An opportunity with a onetimer (events,
// accompanying) matches on onetimer.date only, so a stale one-time timeslot
// left behind by a date change doesn't count; the rest match on timeslots.
export async function findOpportunityAvailabilityDealIds(
  input: string | string[] | undefined,
): Promise<number[] | null> {
  const filter = parseAvailabilityFilter(input);
  if (!filter) {
    return null;
  }
  if (isEmptyFilter(filter)) {
    return [];
  }
  const [slotCondition, params] = getAvailabilityCondition(filter);
  const onetimer = [
    "ot.id IS NOT NULL",
    ...getOnetimeConditions(filter, ONETIMER_START, params),
  ];
  const rows: { dealId: number }[] = await dataSource
    .createQueryBuilder()
    .select("DISTINCT o.deal_id", "dealId")
    .from("opportunity", "o")
    .leftJoin("onetimer", "ot", "ot.id = o.onetimer_id")
    .where(`(ot.id IS NULL AND o.deal_id IN (${DEAL_SLOT_SQL(slotCondition)}))`)
    .orWhere(`(${onetimer.join(" AND ")})`)
    .setParameters(params)
    .getRawMany();
  return rows.map(({ dealId }) => dealId).filter((id) => id !== null);
}

export function dealIdIn(dealIds: number[]) {
  return Raw((column) => `${column} = ANY(:availabilityDealIds)`, {
    availabilityDealIds: dealIds,
  });
}
