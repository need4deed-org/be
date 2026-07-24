import { FindOptionsWhere, ILike } from "typeorm";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { QuerystringAgentFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

// SECURITY (#666): `search`/`street` filter on unmasked DB columns, so a
// non-privileged caller can infer PII masked in the response by probing matches.
//
// `type`/`services` now filter by AgentType/Service id (not the old raw enum
// string), matching how `district` already filters by districtId — a
// contract change for callers of this querystring, tracked alongside #794.
export function getAgentWhere(
  filter: QuerystringAgentFiltering["filter"],
): FindOptionsWhere<Agent> {
  return {
    ...(filter?.type
      ? {
          agentTypeId: normalizeStringArrayInput(filter.type),
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
          agentService: {
            serviceId: normalizeStringArrayInput(filter.services),
          },
        }
      : {}),
  } as FindOptionsWhere<Agent>;
}
