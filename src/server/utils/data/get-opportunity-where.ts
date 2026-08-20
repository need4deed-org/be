import { FindOptionsWhere, ILike } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { QuerystringOpportunityFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

// SECURITY (#666): filters run on unmasked DB columns, so a non-privileged
// caller can infer PII masked in the response by probing which rows match.
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
    // language, district, activity and skill all constrain the same `deal` relation, so they must share a
    // single `deal` key.
    // if we use two spreads with the same key, the second replaces the first, and the earlier
    // constraint is silently dropped.
    ...(filter?.language ||
    filter?.district ||
    filter?.activity ||
    filter?.skill
      ? {
          deal: {
            ...(filter?.language && {
              dealLanguage: {
                language: { id: normalizeStringArrayInput(filter.language) },
              },
            }),
            ...(filter?.district && {
              dealDistrict: {
                district: { id: normalizeStringArrayInput(filter.district) },
              },
            }),
            ...(filter?.activity && {
              dealActivity: {
                activity: { id: normalizeStringArrayInput(filter.activity) },
              },
            }),
            ...(filter?.skill && {
              dealSkill: {
                skill: { id: normalizeStringArrayInput(filter.skill) },
              },
            }),
          },
        }
      : {}),
  } as FindOptionsWhere<Opportunity>;
}
