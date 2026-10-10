import { Lang } from "need4deed-sdk";
import { SelectQueryBuilder } from "typeorm";
import EventN4D from "../../../data/entity/event/event.entity";
import { resolveEventTranslation } from "../../../services/dto/dto-event";
import { berlinDayBoundaries } from "../../../services/jobs/german-holidays";
import { QuerystringEventGetList } from "../../types";
import { parseDateOnly } from "./parse-date-only";

// `from=true` is shorthand for "from now onward"; otherwise a YYYY-MM-DD
// string resolved to the start of that Berlin day.
function resolveFrom(from: string): Date {
  return from === "true"
    ? new Date()
    : berlinDayBoundaries(parseDateOnly(from)).startOfDay;
}

// Narrows an `event` query builder to the requested date range. An event
// matches `from` while it is still in progress (`dateEnd >= from`), and `to`
// covers the whole Berlin day it names.
export function applyEventDateRange(
  qb: SelectQueryBuilder<EventN4D>,
  { from, to }: Pick<QuerystringEventGetList, "from" | "to">,
): SelectQueryBuilder<EventN4D> {
  if (from !== undefined) {
    qb.andWhere("COALESCE(event.dateEnd, event.date) >= :from", {
      from: resolveFrom(from),
    });
  }
  if (to !== undefined) {
    qb.andWhere("event.date <= :to", {
      to: berlinDayBoundaries(parseDateOnly(to)).endOfDay,
    });
  }
  return qb;
}

// Case-insensitive match against the translation the caller will actually be
// shown (same fallback as the DTO), plus the structural hostName / address.
export function matchesEventSearch(
  event: EventN4D,
  language: Lang,
  search: string,
): boolean {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) {
    return true;
  }
  const translation = resolveEventTranslation(event, language);
  return [
    translation?.title,
    translation?.description,
    event.hostName,
    event.address,
  ].some((value) => value?.toLocaleLowerCase().includes(needle));
}
