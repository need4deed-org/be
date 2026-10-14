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

const ISO_DAY_CODES = Object.keys(ByDay) as ByDayCode[];
const WEEKEND_CODES = new Set<ByDayCode>(["SA", "SU"]);
const TIME_SLOTS = new Set<string>(Object.values(TimeSlot));
const OCCASIONAL = new Set<string>(Object.values(OccasionalType));

export type AvailabilityFilter = {
  days: ByDayCode[];
  times: string[];
  occasional: string[];
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
      filter.occasional.push(item);
    }
  }
  return filter;
}

function occasionalCoveringDays(days: ByDayCode[]): OccasionalType[] {
  return [
    ...new Set(
      days.map((code) =>
        WEEKEND_CODES.has(code)
          ? OccasionalType.WEEKENDS
          : OccasionalType.WEEKDAYS,
      ),
    ),
  ];
}

function getAvailabilityCondition({
  days,
  times,
  occasional,
}: AvailabilityFilter): [string, Params] {
  const branches: string[] = [];
  const params: Params = {};
  if (days.length || times.length) {
    const recurring = ["t.rrule IS NOT NULL"];
    const onetime = [
      "t.rrule IS NULL",
      "t.occasional IS NULL",
      "t.start IS NOT NULL",
    ];
    if (days.length) {
      recurring.push("t.rrule ~ :availabilityDayPattern");
      params.availabilityDayPattern = `BYDAY=(${days.join("|")})(;|$)`;
      onetime.push("EXTRACT(ISODOW FROM t.start) IN (:...availabilityIsoDays)");
      params.availabilityIsoDays = days.map(
        (code) => ISO_DAY_CODES.indexOf(code) + 1,
      );
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
            return `(EXTRACT(HOUR FROM t.start) >= :availabilityFrom${i} AND EXTRACT(HOUR FROM t.start) < :availabilityTo${i})`;
          })
          .join(" OR ")})`,
      );
    }
    branches.push(recurring.join(" AND "), onetime.join(" AND "));
  }
  const occasionalTypes = [
    ...new Set([...occasional, ...occasionalCoveringDays(days)]),
  ];
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
