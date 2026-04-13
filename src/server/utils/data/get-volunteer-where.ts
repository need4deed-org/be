import { VolunteerStateTypeType } from "need4deed-sdk";
import { ILike } from "typeorm";
import { QuerystringVolunteerFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export function getVolunteerWhere(
  filter: QuerystringVolunteerFiltering["filter"],
) {
  return {
    ...(filter?.type
      ? {
          type: normalizeStringArrayInput(filter.type),
        }
      : {}),
    ...(filter?.accompanying
      ? {
          statusType: VolunteerStateTypeType.ACCOMPANYING,
        }
      : {}),
    ...(filter?.engagement
      ? {
          statusEngagement: normalizeStringArrayInput(filter.engagement),
        }
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
    ...(filter?.language
      ? {
          deal: {
            profile: {
              profileLanguage: {
                language: {
                  id: normalizeStringArrayInput(filter.language),
                },
              },
            },
          },
        }
      : {}),
    ...(filter?.activity
      ? {
          deal: {
            profile: {
              profileActivity: {
                activity: {
                  id: normalizeStringArrayInput(filter.activity),
                },
              },
            },
          },
        }
      : {}),
    ...(filter?.skill
      ? {
          deal: {
            profile: {
              profileSkill: {
                skill: {
                  id: normalizeStringArrayInput(filter.skill),
                },
              },
            },
          },
        }
      : {}),
    ...(filter?.district
      ? {
          deal: {
            location: {
              locationDistrict: {
                district: {
                  id: normalizeStringArrayInput(filter.district),
                },
              },
            },
          },
        }
      : {}),
  };
}
