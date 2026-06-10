import { ILike } from "typeorm";
import { QuerystringVolunteerFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

// SECURITY (#666): `search` filters on unmasked DB columns, so a non-privileged
// caller can infer PII masked in the response by probing which rows match.
export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
) {
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
          person: [
            { firstName: ILike(`%${filter.search}%`) },
            { lastName: ILike(`%${filter.search}%`) },
            { email: ILike(`%${filter.search}%`) },
          ],
        }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  };
}
