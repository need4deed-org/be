import { FindOptionsWhere, ILike, In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";
import { QuerystringAgentFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

// SECURITY (#666): `search`/`street` filter on unmasked DB columns, so a
// non-privileged caller can infer PII masked in the response by probing matches.
//
// `type`/`services` now filter by AgentType/Service id (not the old raw enum
// string), matching how `district` already filters by districtId — a
// contract change for callers of this querystring, tracked alongside #794.
//
// `services` resolves matching agent ids in a separate query first rather
// than filtering via a joined `agentService: { serviceId: In(...) }`
// condition — that join fans out (one row per matching service), so an
// agent matching more than one selected service would come back duplicated
// and inflate findAndCount's total.
export async function getAgentWhere(
  filter: QuerystringAgentFiltering["filter"],
): Promise<FindOptionsWhere<Agent>> {
  let agentIdsForServices: number[] | null = null;
  if (filter?.services) {
    const serviceIds = (
      Array.isArray(filter.services) ? filter.services : [filter.services]
    ).map(Number);
    const matches = await getRepository(dataSource, AgentService).find({
      where: { serviceId: In(serviceIds) },
    });
    agentIdsForServices = [...new Set(matches.map(({ agentId }) => agentId))];
  }

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
    ...(agentIdsForServices
      ? {
          id: In(agentIdsForServices.length > 0 ? agentIdsForServices : [-1]),
        }
      : {}),
  } as FindOptionsWhere<Agent>;
}
