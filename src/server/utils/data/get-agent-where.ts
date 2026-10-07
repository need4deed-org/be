import { FindOptionsWhere, ILike, In } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";
import { QuerystringAgentFiltering } from "../../types";
import { normalizeStringArrayInput } from "./for-routes";

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
