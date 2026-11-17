import { FindOptionsWhere, Raw } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { QuerystringVolunteerFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";
import { dealIdIn } from "./get-availability-deal-ids";
import { getVolunteerSearchFragment, SqlIdFragment } from "./volunteer-search";

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
  const where = getVolunteerFilterWhere(filter);
  const requested = filter?.ownerAgent ? [filter.ownerAgent].flat() : null;
  const requestedIds = (requested ?? []).map(Number).filter(Number.isInteger);
  const requestsNoOwner = requested?.includes(NO_OWNER) ?? false;

  return {
    ...where,
    ...(availabilityDealIds ? { dealId: dealIdIn(availabilityDealIds) } : {}),
    ...(requested
      ? {
          ownerAgentId: Raw(
            (column) =>
              `(${requestsNoOwner ? `${column} IS NULL OR ` : ""}${column} = ANY(:requestedOwners))`,
            { requestedOwners: requestedIds },
          ),
        }
      : {}),
    ...getIdWhere([
      ...(filter?.search
        ? [getVolunteerSearchFragment(filter.search, visibility)]
        : []),
      ...(visibility
        ? [
            {
              sql: "SELECT id FROM volunteer WHERE owner_agent_id IS NULL OR owner_agent_id = ANY(:visibleOwners) OR person_id = ANY(:visiblePersons)",
              params: {
                visibleOwners: [...visibility.ownerAgentIds],
                visiblePersons: [...visibility.personIds],
              },
            },
          ]
        : []),
    ]),
  };
}

function getIdWhere(fragments: SqlIdFragment[]): FindOptionsWhere<Volunteer> {
  if (!fragments.length) {
    return {};
  }
  return {
    id: Raw(
      (column) =>
        fragments.map(({ sql }) => `${column} IN (${sql})`).join(" AND "),
      Object.assign({}, ...fragments.map(({ params }) => params)),
    ),
  };
}

export function getVolunteerFilterWhere(
  filter: QuerystringVolunteerFiltering["filter"],
): FindOptionsWhere<Volunteer> {
  const dealFilter: Record<string, unknown> = {};
  if (filter?.language) {
    dealFilter.dealLanguage = {
      language: { id: normalizeStringArrayInput(filter.language) },
    };
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
