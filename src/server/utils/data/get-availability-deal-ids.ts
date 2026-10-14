import {
  AVAILABILITY_FILTER_SEPARATOR,
  AvailabilityFilterGroup,
  ByDay,
  OccasionalType,
  TimeSlot,
} from "need4deed-sdk";
import { Raw } from "typeorm";
import { dataSource } from "../../../data/data-source";
import { ByDayCode, getByDayCode } from "../../../data/utils/by-day-code";

const ISO_DAY: Record<ByDayCode, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};
const OCCASIONAL_DAYS: Record<OccasionalType, ByDayCode[]> = {
  [OccasionalType.WEEKDAYS]: ["MO", "TU", "WE", "TH", "FR"],
  [OccasionalType.WEEKENDS]: ["SA", "SU"],
};
const TIME_SLOTS = new Set<string>(Object.values(TimeSlot));
const OCCASIONAL = new Set<string>(Object.values(OccasionalType));
const SERVER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOCAL_TIME_ZONE = "Europe/Berlin";
// one-time starts are absolute instants stored as server-local wall time
const ONETIME_START =
  "((t.start AT TIME ZONE :availabilityServerTimeZone) AT TIME ZONE :availabilityLocalTimeZone)";

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
      group === AvailabilityFilterGroup.DAYS ? getByDayCode(item) : null;
    if (dayCode && ByDay[dayCode] === item) {
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

function getAvailabilityCondition(
  filter: AvailabilityFilter,
): [string, Params] {
  const { days, times, occasional } = filter;
  const branches: string[] = [];
  const params: Params = {};
  const slotDays = [
    ...new Set([
      ...days,
      ...occasional.flatMap((type) => OCCASIONAL_DAYS[type]),
    ]),
  ];
  if (slotDays.length || times.length) {
    const recurring = ["t.rrule IS NOT NULL"];
    const onetime = [
      "t.rrule IS NULL",
      "t.occasional IS NULL",
      "t.start IS NOT NULL",
    ];
    if (slotDays.length) {
      recurring.push("t.rrule ~ :availabilityDayPattern");
      params.availabilityDayPattern = `BYDAY=([^;]*,)?(${slotDays.join("|")})(,|;|$)`;
      onetime.push(
        `EXTRACT(ISODOW FROM ${ONETIME_START}) IN (:...availabilityIsoDays)`,
      );
      params.availabilityIsoDays = slotDays.map((day) => ISO_DAY[day]);
    }
    if (times.length) {
      recurring.push(
        `to_char(t.start, 'HH24') || '-' || to_char(t."end", 'HH24') IN (:...availabilityTimes)`,
      );
      params.availabilityTimes = times;
      onetime.push(
        `(${times
          .map((time, i) => {
            const [from, to] = time.split("-").map(Number);
            params[`availabilityFrom${i}`] = from;
            params[`availabilityTo${i}`] = to;
            return `(EXTRACT(HOUR FROM ${ONETIME_START}) >= :availabilityFrom${i} AND EXTRACT(HOUR FROM ${ONETIME_START}) < :availabilityTo${i})`;
          })
          .join(" OR ")})`,
      );
    }
    params.availabilityServerTimeZone = SERVER_TIME_ZONE;
    params.availabilityLocalTimeZone = LOCAL_TIME_ZONE;
    branches.push(recurring.join(" AND "), onetime.join(" AND "));
  }
  const occasionalTypes = matchingOccasionalTypes(filter);
  if (occasionalTypes.length) {
    branches.push("t.occasional::text IN (:...availabilityOccasional)");
    params.availabilityOccasional = occasionalTypes;
  }
  return [branches.map((b) => `(${b})`).join(" OR "), params];
}

export async function findAvailabilityDealIds(
  input: string | string[] | undefined,
): Promise<number[] | null> {
  const filter = parseAvailabilityFilter(input);
  if (!filter) {
    return null;
  }
  if (
    !filter.days.length &&
    !filter.times.length &&
    !filter.occasional.length
  ) {
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

export function dealIdIn(dealIds: number[]) {
  return Raw((column) => `${column} = ANY(:availabilityDealIds)`, {
    availabilityDealIds: dealIds,
  });
}
