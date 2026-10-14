import { ByDay, OccasionalType, TimeSlot } from "need4deed-sdk";
import { Raw } from "typeorm";

const SEPARATOR = "|";
const BY_DAY_CODE = new Map(
  Object.entries(ByDay).map(([code, name]) => [name as string, code]),
);
const TIME_SLOTS = new Set<string>(Object.values(TimeSlot));
const OCCASIONAL = new Set<string>(Object.values(OccasionalType));

export type AvailabilityFilter = {
  days: string[];
  times: string[];
  occasional: string[];
};

export function parseAvailabilityFilter(
  input: string | string[] | undefined,
): AvailabilityFilter | null {
  const filter: AvailabilityFilter = { days: [], times: [], occasional: [] };
  for (const value of [input ?? []].flat()) {
    const [group, item] = value.split(SEPARATOR);
    if (group === "days" && BY_DAY_CODE.has(item)) {
      filter.days.push(BY_DAY_CODE.get(item) as string);
    } else if (group === "times" && TIME_SLOTS.has(item)) {
      filter.times.push(item);
    } else if (group === "occasional" && OCCASIONAL.has(item)) {
      filter.occasional.push(item);
    }
  }
  const isEmpty =
    !filter.days.length && !filter.times.length && !filter.occasional.length;
  return isEmpty ? null : filter;
}

export function dealIdMatchingAvailability({
  days,
  times,
  occasional,
}: AvailabilityFilter) {
  const branches: string[] = [];
  if (days.length || times.length) {
    const conditions = ["t.rrule IS NOT NULL"];
    if (days.length) {
      conditions.push(
        `(${days.map((_, i) => `t.rrule LIKE :availabilityDay${i}`).join(" OR ")})`,
      );
    }
    if (times.length) {
      conditions.push(
        `to_char(t.start, 'HH24') || '-' || to_char(t."end", 'HH24') IN (:...availabilityTimes)`,
      );
    }
    branches.push(conditions.join(" AND "));
  }
  if (occasional.length) {
    branches.push(`t.occasional::text IN (:...availabilityOccasional)`);
  }
  const params: Record<string, unknown> = {
    ...Object.fromEntries(
      days.map((code, i) => [`availabilityDay${i}`, `%BYDAY=%${code}%`]),
    ),
    ...(times.length ? { availabilityTimes: times } : {}),
    ...(occasional.length ? { availabilityOccasional: occasional } : {}),
  };
  return Raw(
    (column) =>
      `${column} IN (SELECT dt.deal_id FROM deal_timeslot dt JOIN timeslot t ON t.id = dt.timeslot_id WHERE ${branches.map((b) => `(${b})`).join(" OR ")})`,
    params,
  );
}
