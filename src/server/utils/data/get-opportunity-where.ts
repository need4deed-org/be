import { OpportunityType, TranslationStatus } from "need4deed-sdk";
import {
  Between,
  FindOptionsWhere,
  ILike,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Raw,
} from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { berlinDayBoundaries } from "../../../services/jobs/berlin-dates";
import {
  QuerystringOpportunityFiltering,
  QuerystringOpportunityList,
} from "../../types";
import { normalizeStringArrayInput } from "./for-routes";
import { dealIdIn } from "./get-availability-deal-ids";
import { parseDateOnly } from "./parse-date-only";
import { escapeLikePattern } from "./person-name-ilike";

export type OpportunityAppointmentFilter = Pick<
  QuerystringOpportunityList,
  | "appointmentDateFrom"
  | "appointmentDateTo"
  | "hasAppointmentDate"
  | "excludeAccompanying"
>;

type SearchField = "title" | "info";

const SEARCH_FIELDS: readonly SearchField[] = ["title", "info"];

// Mirrors translation/resolve.ts: a translation is only displayed when it is
// DONE, in the response language, and its sourceHash still matches the
// current (JS-trimmed) source text.
const TRIM_CHARS = " \t\n\r\f\v\u00a0\ufeff";
const TRANSLATION_SEARCH_SQL = (alias: string) => `${alias} IN (
  SELECT ft.opportunity_id
    FROM field_translation ft
    JOIN opportunity o ON o.id = ft.opportunity_id
   WHERE ft.language_id = :searchLanguageId
     AND ft.status = :searchTranslationStatus
     AND ft.field_name IN (:...searchFields)
     AND ft.translation ILIKE :searchPattern
     AND ft.source_hash = encode(sha256(convert_to(btrim(
           CASE ft.field_name WHEN 'title' THEN o.title ELSE o.info END,
           :searchTrimChars), 'UTF8')), 'hex'))`;

// Matches the original text or its displayed translation in the request
// language, on the given fields only.
export function getSearchBranches(
  pattern: string,
  languageId?: number,
  fields: readonly SearchField[] = SEARCH_FIELDS,
): FindOptionsWhere<Opportunity>[] {
  const branches: FindOptionsWhere<Opportunity>[] = fields.map((field) => ({
    [field]: ILike(pattern),
  }));
  if (languageId !== undefined) {
    branches.push({
      id: Raw(TRANSLATION_SEARCH_SQL, {
        searchLanguageId: languageId,
        searchFields: fields,
        searchTranslationStatus: TranslationStatus.DONE,
        searchPattern: pattern,
        searchTrimChars: TRIM_CHARS,
      }),
    });
  }
  return branches;
}

function hasFilterValue(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function getAppointmentDateWhere(
  appointment?: OpportunityAppointmentFilter,
): FindOptionsWhere<Opportunity> {
  const { appointmentDateFrom, appointmentDateTo, hasAppointmentDate } =
    appointment ?? {};

  if (appointmentDateFrom !== undefined || appointmentDateTo !== undefined) {
    const from =
      appointmentDateFrom !== undefined
        ? berlinDayBoundaries(parseDateOnly(appointmentDateFrom)).startOfDay
        : undefined;
    const to =
      appointmentDateTo !== undefined
        ? berlinDayBoundaries(parseDateOnly(appointmentDateTo)).endOfDay
        : undefined;

    return {
      onetimer: {
        date:
          from && to
            ? Between(from, to)
            : from
              ? MoreThanOrEqual(from)
              : LessThanOrEqual(to!),
      },
    } as FindOptionsWhere<Opportunity>;
  }

  if (hasAppointmentDate) {
    return { onetimerId: Not(IsNull()) } as FindOptionsWhere<Opportunity>;
  }

  return {};
}

function getTypeWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  excludeAccompanying?: boolean,
): FindOptionsWhere<Opportunity> {
  if (hasFilterValue(filter?.type)) {
    const types = Array.isArray(filter.type) ? filter.type : [filter.type];
    const filtered = excludeAccompanying
      ? types.filter((type) => type !== OpportunityType.ACCOMPANYING)
      : types;
    return {
      type: normalizeStringArrayInput(filtered),
    } as FindOptionsWhere<Opportunity>;
  }

  return excludeAccompanying
    ? ({
        type: Not(OpportunityType.ACCOMPANYING),
      } as FindOptionsWhere<Opportunity>)
    : {};
}

function getDealWhere(
  filter: QuerystringOpportunityFiltering["filter"],
): Record<string, unknown> {
  const dealFilter: Record<string, unknown> = {};
  if (hasFilterValue(filter?.language)) {
    dealFilter.dealLanguage = {
      language: { id: normalizeStringArrayInput(filter.language) },
    };
  }
  if (hasFilterValue(filter?.activity)) {
    dealFilter.dealActivity = {
      activity: { id: normalizeStringArrayInput(filter.activity) },
    };
  }
  if (hasFilterValue(filter?.skill)) {
    dealFilter.dealSkill = {
      skill: { id: normalizeStringArrayInput(filter.skill) },
    };
  }
  return dealFilter;
}

export function getOpportunityWhere(
  filter: QuerystringOpportunityFiltering["filter"],
  appointment?: OpportunityAppointmentFilter,
  searchLanguageId?: number,
  availabilityDealIds: number[] | null = null,
): FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[] {
  const dealFilter = getDealWhere(filter);

  const base = {
    ...(availabilityDealIds ? { dealId: dealIdIn(availabilityDealIds) } : {}),
    ...getTypeWhere(filter, appointment?.excludeAccompanying),
    ...getAppointmentDateWhere(appointment),
    ...(hasFilterValue(filter?.status)
      ? {
          status: normalizeStringArrayInput(filter.status),
        }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  } as FindOptionsWhere<Opportunity>;

  const searchPattern = filter?.search
    ? `%${escapeLikePattern(filter.search)}%`
    : undefined;
  let branches: FindOptionsWhere<Opportunity>[] = searchPattern
    ? getSearchBranches(searchPattern, searchLanguageId).map((branch) => ({
        ...base,
        ...branch,
      }))
    : [base];

  if (hasFilterValue(filter?.district)) {
    const districtIds = normalizeStringArrayInput(filter!.district!);
    branches = branches.flatMap((branch) => [
      { ...branch, districtId: districtIds },
      {
        ...branch,
        deal: {
          ...((branch.deal as Record<string, unknown>) ?? {}),
          dealDistrict: { district: { id: districtIds } },
        },
      },
    ]) as FindOptionsWhere<Opportunity>[];
  }

  return branches.length === 1 ? branches[0] : branches;
}
