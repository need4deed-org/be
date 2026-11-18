import { FindOptionsWhere, ILike, In, Raw } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";
import { QuerystringAgentFiltering } from "../../types";
import { CallerVisibility } from "../pii/visible-persons";
import { normalizeStringArrayInput } from "./for-routes";
import { andIntoWhere } from "./merge-into-where";
import { optionTitleMatch } from "./option-search-sql";
import { escapeLikePattern } from "./person-name-ilike";

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

  const where = {
    ...(filter?.type
      ? {
          agentTypeId: normalizeStringArrayInput(filter.type),
        }
      : {}),
    ...(filter?.status
      ? {
          trustLevel: normalizeStringArrayInput(filter.status),
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

  if (filter?.search) {
    andIntoWhere(
      where,
      "id",
      Raw(getAgentSearchSql(visibility === null), {
        searchPattern: `%${escapeLikePattern(filter.search)}%`,
      }),
    );
  }
  return where;
}

const getAgentSearchSql = (includeStreet: boolean) => (column: string) =>
  `${column} IN (
  SELECT a.id FROM agent a
   WHERE a.title ILIKE :searchPattern
      OR a.info ILIKE :searchPattern
      OR EXISTS (SELECT 1 FROM district d WHERE d.id = a.district_id AND d.title ILIKE :searchPattern)
      OR EXISTS (SELECT 1 FROM agent_type t WHERE t.id = a.agent_type_id AND ${optionTitleMatch("t", "agent_type")})
      OR EXISTS (SELECT 1 FROM organization o WHERE o.id = a.organization_id AND o.title ILIKE :searchPattern)
      OR EXISTS (SELECT 1 FROM agent_language j JOIN language l ON l.id = j.language_id WHERE j.agent_id = a.id AND ${optionTitleMatch("l", "language")})
      OR EXISTS (SELECT 1 FROM agent_service j JOIN service s ON s.id = j.service_id WHERE j.agent_id = a.id AND ${optionTitleMatch("s", "service")})${
        includeStreet
          ? `
      OR EXISTS (SELECT 1 FROM address ad WHERE ad.id = a.address_id AND ad.street ILIKE :searchPattern)`
          : ""
      })`;
