import { ByDay, OccasionalType } from "need4deed-sdk";
import { Raw } from "typeorm";

const SEPARATOR = "~";
const BY_DAY_CODE = new Map(
  Object.entries(ByDay).map(([code, name]) => [name as string, code]),
);
const WEEKEND_CODES = new Set(["SA", "SU"]);
const TIME_RANGE = /^\d{2}-\d{2}$/;
const OCCASIONAL = new Set<string>(Object.values(OccasionalType));

export type AvailabilityFilter = {
  days: string[];
  times: string[];
  occasional: string[];
};

export function parseAvailabilityFilter(
  input: string | string[] | undefined,
): AvailabilityFilter | null {
  const values = [input ?? []].flat().filter(Boolean);
  if (!values.length) {
    return null;
  }
  const filter: AvailabilityFilter = { days: [], times: [], occasional: [] };
  for (const value of values) {
    const [group, item] = value.split(SEPARATOR);
    if (group === "days" && BY_DAY_CODE.has(item)) {
      filter.days.push(BY_DAY_CODE.get(item) as string);
    } else if (group === "times" && TIME_RANGE.test(item)) {
      filter.times.push(item);
    } else if (group === "occasional" && OCCASIONAL.has(item)) {
      filter.occasional.push(item);
    }
  }
  return filter;
}

function occasionalCoveringDays(days: string[]): string[] {
  const covering = new Set<string>();
  for (const code of days) {
    covering.add(
      WEEKEND_CODES.has(code)
        ? OccasionalType.WEEKENDS
        : OccasionalType.WEEKDAYS,
    );
  }
  return [...covering];
}

export function dealIdMatchingAvailability({
  days,
  times,
  occasional,
}: AvailabilityFilter) {
  const branches: string[] = [];
  const params: Record<string, unknown> = {};
  if (days.length || times.length) {
    const conditions = ["t.rrule IS NOT NULL"];
    if (days.length) {
      conditions.push(`t.rrule ~ :availabilityDayPattern`);
      params.availabilityDayPattern = `BYDAY=([^;,]*,)*[+-]?[0-9]*(${days.join("|")})(,|;|$)`;
    }
    if (times.length) {
      conditions.push(
        `to_char(t.start, 'HH24') || '-' || to_char(t."end", 'HH24') IN (:...availabilityTimes)`,
      );
      params.availabilityTimes = times;
    }
    branches.push(conditions.join(" AND "));
  }
  const occasionalTypes = [
    ...new Set([
      ...occasional,
      ...(times.length ? [] : occasionalCoveringDays(days)),
    ]),
  ];
  if (occasionalTypes.length) {
    branches.push(`t.occasional::text IN (:...availabilityOccasional)`);
    params.availabilityOccasional = occasionalTypes;
  }
  const where = branches.length
    ? branches.map((b) => `(${b})`).join(" OR ")
    : "FALSE";
  return Raw(
    (column) =>
      `${column} IN (SELECT dt.deal_id FROM deal_timeslot dt JOIN timeslot t ON t.id = dt.timeslot_id WHERE ${where})`,
    params,
  );
}
