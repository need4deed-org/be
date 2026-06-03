import { FindOptionsWhere, ILike } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { QuerystringOpportunityFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export function getOpportunityWhere(
  filter: QuerystringOpportunityFiltering["filter"],
): FindOptionsWhere<Opportunity> {
  return {
    ...(filter?.type
      ? {
          type: normalizeStringArrayInput(filter.type),
        }
      : {}),
    ...(filter?.status
      ? {
          status: normalizeStringArrayInput(filter.status),
        }
      : {}),
    ...(filter?.search
      ? {
          title: ILike(`%${filter.search}%`),
        }
      : {}),
    ...(filter?.language
      ? {
          deal: {
            dealLanguage: {
              language: {
                id: normalizeStringArrayInput(filter.language),
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
    ...(filter?.activity
      ? {
          deal: {
            dealActivity: {
              activity: {
                id: normalizeStringArrayInput(filter.activity),
              },
            },
          },
        }
      : {}),
  } as FindOptionsWhere<Opportunity>;
}
