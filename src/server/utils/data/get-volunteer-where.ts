import { ILike } from "typeorm";
import { QuerystringVolunteerFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
) {
  // Build deal.profile sub-filter to avoid overwriting when multiple profile
  // relations are active (language shares the same deal key).
  const profileFilter: Record<string, unknown> = {};
  if (filter?.language) {
    profileFilter.profileLanguage = {
      language: { id: normalizeStringArrayInput(filter.language) },
    };
  }

  const dealFilter: Record<string, unknown> = {};
  if (Object.keys(profileFilter).length) {
    dealFilter.profile = profileFilter;
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
    dealFilter.location = {
      locationDistrict: {
        district: { id: normalizeStringArrayInput(filter.district) },
      },
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
