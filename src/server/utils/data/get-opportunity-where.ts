import { FindOptionsWhere } from "typeorm";
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
  } as FindOptionsWhere<Opportunity>;
}
