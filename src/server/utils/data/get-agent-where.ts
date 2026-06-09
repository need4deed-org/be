import { ArrayOverlap, FindOptionsWhere, ILike } from "typeorm";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { QuerystringAgentFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

export function getAgentWhere(
  filter: QuerystringAgentFiltering["filter"],
): FindOptionsWhere<Agent> {
  return {
    ...(filter?.type
      ? {
          type: normalizeStringArrayInput(filter.type),
        }
      : {}),
    ...(filter?.search
      ? {
          title: ILike(`%${filter.search}%`),
        }
      : {}),
    ...(filter?.street
      ? {
          // Powers the self-registration picker: match agents by street so the
          // user can find their org before creating a duplicate. The address
          // relation is already loaded by the GET /agent list handler.
          address: { street: ILike(`%${filter.street}%`) },
        }
      : {}),
    ...(filter?.volunteerSearch
      ? {
          searchStatus: normalizeStringArrayInput(filter.volunteerSearch),
        }
      : {}),
    ...(filter?.engagementStatus
      ? {
          engagementStatus: normalizeStringArrayInput(filter.engagementStatus),
        }
      : {}),
    ...(filter?.district
      ? {
          districtId: normalizeStringArrayInput(filter.district),
        }
      : {}),
    ...(filter?.services
      ? {
          services: ArrayOverlap(filter.services),
        }
      : {}),
  } as FindOptionsWhere<Agent>;
}
