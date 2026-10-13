import { FindOptionsWhere, ILike, In, IsNull, Raw } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { QuerystringVolunteerFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";
import { escapeLikePattern } from "./person-name-ilike";

const SEARCH_FIELDS = ["firstName", "lastName", "email", "phone"] as const;
const PHONE_LIKE = /^[\d\s+()\-./]+$/;
const MIN_PHONE_DIGITS = 3;

function getPersonSearchBranches(search: string): Record<string, unknown>[] {
  const pattern = `%${escapeLikePattern(search)}%`;
  const branches: Record<string, unknown>[] = SEARCH_FIELDS.map((field) => ({
    [field]: ILike(pattern),
  }));
  const digits = search.replace(/\D/g, "");
  if (PHONE_LIKE.test(search) && digits.length >= MIN_PHONE_DIGITS) {
    branches.push({
      phone: Raw(
        (alias) => `regexp_replace(${alias}, '\\D', '', 'g') LIKE :phoneDigits`,
        { phoneDigits: `%${digits}%` },
      ),
    });
  }
  return branches;
}

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
  visibility: CallerVisibility | null = null,
): FindOptionsWhere<Volunteer> | FindOptionsWhere<Volunteer>[] {
  const where = getVolunteerFilterWhere(filter, visibility);
  const requestedOwners = filter?.ownerAgent
    ? [filter.ownerAgent].flat().map(Number).filter(Number.isInteger)
    : null;

  if (!visibility) {
    return requestedOwners
      ? { ...where, ownerAgentId: In(requestedOwners) }
      : where;
  }

  const visibleOwners = [...visibility.ownerAgentIds].filter(
    (id) => !requestedOwners || requestedOwners.includes(id),
  );
  const personIds = [...visibility.personIds];
  const branches: FindOptionsWhere<Volunteer>[] = [];
  if (!requestedOwners) {
    branches.push({ ...where, ownerAgentId: IsNull() });
  }
  if (visibleOwners.length) {
    branches.push({ ...where, ownerAgentId: In(visibleOwners) });
  }
  if (personIds.length) {
    branches.push({
      ...where,
      personId: In(personIds),
      ...(requestedOwners ? { ownerAgentId: In(requestedOwners) } : {}),
    });
  }
  return branches.length ? branches : { ...where, id: In([-1]) };
}

export function getVolunteerFilterWhere(
  filter: QuerystringVolunteerFiltering["filter"],
  visibility: CallerVisibility | null,
): FindOptionsWhere<Volunteer> {
  const personScope = visibility
    ? { id: In(visibility.personIds.size ? [...visibility.personIds] : [-1]) }
    : {};

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
    ...(filter?.search
      ? {
          person: getPersonSearchBranches(filter.search).map((branch) => ({
            ...branch,
            ...personScope,
          })),
        }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  } as FindOptionsWhere<Volunteer>;
}
