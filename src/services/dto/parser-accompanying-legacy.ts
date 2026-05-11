import { OpportunityLegacyFormData, TranslatedIntoType } from "need4deed-sdk";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

// Parses a datetime string as Europe/Berlin time when no timezone is specified.
// Uses the Intl API so DST transitions (CET⇔CEST) are handled automatically.
function parseAccompDatetime(value: string | undefined): Date {
  if (!value) return new Date(NaN);
  if (/Z|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);

  const asIfUtc = new Date(value + "Z");
  if (isNaN(asIfUtc.getTime())) return asIfUtc;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(asIfUtc);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const berlinAsUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return new Date(asIfUtc.getTime() - (berlinAsUtcMs - asIfUtc.getTime()));
}

export function accompanyingParserOpportunity(
  body: OpportunityLegacyFormData,
): Accompanying {
  const accompanying = new Accompanying({
    address: body.accomp_address,
    name: body.accomp_name,
    phone: body.accomp_phone,
    date: parseAccompDatetime(body.accomp_datetime),
    languageToTranslate: body.accomp_translation as TranslatedIntoType,
  });

  return accompanying;
}
