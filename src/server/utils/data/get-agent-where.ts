import { FindOptionsWhere, ILike, In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";
import { QuerystringAgentFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";

export async function getAgentWhere(
  filter: QuerystringAgentFiltering["filter"],
  visibility: CallerVisibility | null = null,
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

  let agentIds = agentIdsForServices;
  if (visibility && filter?.street) {
    const visibleAgentIds = new Set([
      ...visibility.agentIds,
      ...visibility.matchedAgentIds,
    ]);
    agentIds = (agentIds ?? [...visibleAgentIds]).filter((id) =>
      visibleAgentIds.has(id),
    );
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
    ...(agentIds
      ? {
          id: In(agentIds.length > 0 ? agentIds : [-1]),
        }
      : {}),
  } as FindOptionsWhere<Agent>;
}
