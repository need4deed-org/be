import { ILike, In } from "typeorm";
import { QuerystringVolunteerFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
  visibility: CallerVisibility | null = null,
) {
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
          person: [
            { firstName: ILike(`%${filter.search}%`), ...personScope },
            { lastName: ILike(`%${filter.search}%`), ...personScope },
            { email: ILike(`%${filter.search}%`), ...personScope },
          ],
        }
      : {}),
    ...(Object.keys(dealFilter).length ? { deal: dealFilter } : {}),
  };
}
