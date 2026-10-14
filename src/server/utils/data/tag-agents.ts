import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  UserRole,
} from "need4deed-sdk";
import { In, SelectQueryBuilder } from "typeorm";
import { BadRequestError, UnauthorizedError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { isStaffRole } from "./is-staff-role";
import { getTaggedAgentIds } from "./tagged-agents";
import { validateRelationIds } from "./validate-relation-ids";

export function canTagAgents(role: UserRole | undefined): boolean {
  return role === UserRole.AGENT || isStaffRole(role);
}

export async function taggableAgentsQuery(request: FastifyRequest): Promise<{
  query: SelectQueryBuilder<Agent>;
  ownAgentIds: number[];
}> {
  const ownAgentIds = await getCallerAgentIds(
    request,
    request.authUser?.personId,
  );
  const query = request.server.db.agentRepository
    .createQueryBuilder("agent")
    .where("agent.unclaimed = false")
    .andWhere(
      "(agent.engagementStatus IS NULL OR agent.engagementStatus != :inactive)",
      { inactive: AgentEngagementStatusType.INACTIVE },
    );
  if (ownAgentIds.length) {
    query.andWhere("agent.id NOT IN (:...ownAgentIds)", { ownAgentIds });
  }
  return { query, ownAgentIds };
}

export function resolveTaggedAgentIds(
  text: string,
  taggedAgentIds: number[] | null | undefined,
  previousAgentIds: number[],
): number[] {
  const tokenIds = getTaggedAgentIds(text);
  if (taggedAgentIds === null || taggedAgentIds === undefined) {
    return tokenIds.filter((id) => previousAgentIds.includes(id));
  }
  const requested = new Set(taggedAgentIds);
  if (
    requested.size !== tokenIds.length ||
    tokenIds.some((id) => !requested.has(id))
  ) {
    throw new BadRequestError(
      "taggedAgentIds must match the <@agent:ID> tokens in the text.",
    );
  }
  return tokenIds;
}

export async function assertTaggableAgents(
  request: FastifyRequest,
  agentIds: number[],
): Promise<Agent[]> {
  if (agentIds.length === 0) {
    return [];
  }
  if (!canTagAgents(request.authUser?.role)) {
    throw new UnauthorizedError("Only NGO users and staff can tag NGOs.");
  }
  const { query } = await taggableAgentsQuery(request);
  const agents = await query
    .select(["agent.id", "agent.title"])
    .andWhere("agent.id IN (:...agentIds)", { agentIds })
    .getMany();
  validateRelationIds(agentIds, agents, "tagged agent");
  return agents;
}

export async function getAgentMemberPersons(
  request: FastifyRequest,
  agentIds: number[],
): Promise<Person[]> {
  if (agentIds.length === 0) {
    return [];
  }
  const members = await request.server.db.agentPersonRepository.find({
    where: { agentId: In(agentIds), status: AgentMembershipStatus.ACTIVE },
    relations: ["person"],
  });
  return members.map((m) => m.person).filter(Boolean);
}

export function mergePersons(...groups: Person[][]): Person[] {
  const byId = new Map<number, Person>();
  groups.flat().forEach((person) => byId.set(person.id, person));
  return [...byId.values()];
}
