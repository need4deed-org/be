import { VolunteerStateTypeType } from "need4deed-sdk";
import { ILike } from "typeorm";
import { QuerystringVolunteerFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
) {
  // Build deal.profile sub-filter to avoid overwriting when multiple profile
  // relations are active (language, activity, skill all share the same deal key).
  const profileFilter: Record<string, unknown> = {};
  if (filter?.language) {
    profileFilter.profileLanguage = { language: { id: normalizeStringArrayInput(filter.language) } };
  }
  if (filter?.activity) {
    profileFilter.profileActivity = { activity: { id: normalizeStringArrayInput(filter.activity) } };
  }
  if (filter?.skill) {
    profileFilter.profileSkill = { skill: { id: normalizeStringArrayInput(filter.skill) } };
  }

  const dealFilter: Record<string, unknown> = {};
  if (Object.keys(profileFilter).length) {
    dealFilter.profile = profileFilter;
  }
  if (filter?.district) {
    dealFilter.location = { locationDistrict: { district: { id: normalizeStringArrayInput(filter.district) } } };
  }

  return {
    ...(filter?.type ? { statusType: normalizeStringArrayInput(filter.type) } : {}),
    ...(filter?.accompanying ? { statusType: VolunteerStateTypeType.ACCOMPANYING } : {}),
    ...(filter?.engagement ? { statusEngagement: normalizeStringArrayInput(filter.engagement) } : {}),
    ...(filter?.match ? { statusMatch: normalizeStringArrayInput(filter.match) } : {}),
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
