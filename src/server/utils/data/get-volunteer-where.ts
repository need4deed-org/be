import { LanguageMatch, QueryParamsKeys } from "need4deed-sdk";
import { FindOptionsWhere, In, Raw } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { QuerystringVolunteerFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";
import { dealIdIn } from "./get-availability-deal-ids";
import { andIntoWhere } from "./merge-into-where";
import { getVolunteerSearchFragment } from "./volunteer-search";

const NO_OWNER = "none";

export function normalizeVolunteerStatusFilter(
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalize = (status: string) =>
    status.startsWith("vol-") ? status : `vol-${status}`;
  return Array.isArray(value) ? value.map(normalize) : normalize(value);
}

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
  visibility: CallerVisibility | null = null,
  availabilityDealIds: number[] | null = null,
): FindOptionsWhere<Volunteer> {
  const requested = filter?.ownerAgent ? [filter.ownerAgent].flat() : null;
  const requestedIds = (requested ?? []).map(Number).filter(Number.isInteger);
  const requestsNoOwner = requested?.includes(NO_OWNER) ?? false;

  const where: FindOptionsWhere<Volunteer> = {
    ...getVolunteerFilterWhere(filter),
  };
  if (availabilityDealIds) {
    andIntoWhere(where, "dealId", dealIdIn(availabilityDealIds));
  }
  if (requested) {
    andIntoWhere(
      where,
      "id",
      Raw(
        (column) =>
          `${column} IN (SELECT id FROM volunteer WHERE ${requestsNoOwner ? "owner_agent_id IS NULL OR " : ""}owner_agent_id = ANY(:requestedOwners) UNION SELECT volunteer_id FROM volunteer_agent_link WHERE agent_id = ANY(:requestedLinkAgents))`,
        {
          requestedOwners: requestedIds,
          requestedLinkAgents: visibility
            ? requestedIds.filter((id) => visibility.agentIds.has(id))
            : requestedIds,
        },
      ),
    );
  }
  if (filter?.search) {
    const { sql, params } = getVolunteerSearchFragment(
      filter.search,
      visibility,
    );
    andIntoWhere(
      where,
      "id",
      Raw((column) => `${column} IN (${sql})`, params),
    );
  }
  if (visibility) {
    andIntoWhere(
      where,
      "id",
      Raw(
        (column) =>
          `${column} IN (SELECT id FROM volunteer WHERE owner_agent_id IS NULL OR owner_agent_id = ANY(:visibleOwners) OR person_id = ANY(:visiblePersons))`,
        {
          visibleOwners: [...visibility.ownerAgentIds],
          visiblePersons: [...visibility.personIds],
        },
      ),
    );
  }
  return where;
}

export function getVolunteerFilterWhere(
  filter: QuerystringVolunteerFiltering["filter"],
): FindOptionsWhere<Volunteer> {
  const dealFilter: Record<string, unknown> = {};
  const matchesAllLanguages =
    filter?.[QueryParamsKeys.LANGUAGE_MATCH] === LanguageMatch.ALL;
  const languages = [filter?.language ?? []].flat().filter(Boolean);
  const languageIds = matchesAllLanguages
    ? [...new Set(languages.map(Number))]
    : [];
  if (languages.length && !matchesAllLanguages) {
    dealFilter.dealLanguage = { language: { id: In(languages) } };
  }
  if (filter?.activity) {
    dealFilter.dealActivity = {
      activity: { id: normalizeStringArrayInput(filter.activity) },
    };
  }
  if (filter?.skill) {
    dealFilter.dealSkill = {
      skill: { id: normalizeStringArrayInput(filter.skill) },
    };
  }
  if (filter?.district) {
    dealFilter.dealDistrict = {
      district: { id: normalizeStringArrayInput(filter.district) },
    };
  }

  return {
    ...(languageIds.length
      ? {
          dealId: Raw(
            (column) =>
              // TypeORM expands ${column} only when a space, "=", ")" or "," follows
              `(SELECT COUNT(DISTINCT dl.language_id) FROM deal_language dl WHERE dl.language_id = ANY(:selectedLanguageIds) AND dl.deal_id = ${column} ) = :selectedLanguageCount`,
            {
              selectedLanguageIds: languageIds,
              selectedLanguageCount: languageIds.length,
            },
          ),
        }
      : {}),
    ...(filter?.type
      ? { statusType: normalizeStringArrayInput(filter.type) }
      : {}),
    ...(filter?.engagement
      ? { statusEngagement: normalizeStringArrayInput(filter.engagement) }
      : {}),
    ...(filter?.match
      ? { statusMatch: normalizeStringArrayInput(filter.match) }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  } as FindOptionsWhere<Volunteer>;
}
