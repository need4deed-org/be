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

export async function taggableAgentsQuery(
  request: FastifyRequest,
  postAgentId?: number | null,
): Promise<{
  query: SelectQueryBuilder<Agent>;
  ownAgentIds: number[];
}> {
  const ownAgentIds = [
    ...(await getCallerAgentIds(request, request.authUser?.personId)),
    ...(postAgentId ? [postAgentId] : []),
  ];
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
  previousAgents: Pick<Agent, "id" | "unclaimed">[],
): number[] {
  const tokenIds = getTaggedAgentIds(text);
  const kept = (agent: Pick<Agent, "id" | "unclaimed">) =>
    tokenIds.includes(agent.id);
  if (taggedAgentIds === null || taggedAgentIds === undefined) {
    return previousAgents.filter(kept).map((agent) => agent.id);
  }
  const requested = [...new Set(taggedAgentIds)];
  if (requested.some((id) => !tokenIds.includes(id))) {
    throw new BadRequestError(
      "taggedAgentIds must appear as <@agent:ID> tokens in the text.",
    );
  }
  // Unclaimed NGOs are hidden from clients, so a round-trip can't keep them.
  const hidden = previousAgents
    .filter((agent) => agent.unclaimed && kept(agent))
    .map((agent) => agent.id);
  return [...new Set([...requested, ...hidden])];
}

export async function assertTaggableAgents(
  request: FastifyRequest,
  agentIds: number[],
  postAgentId?: number | null,
): Promise<Agent[]> {
  if (agentIds.length === 0) {
    return [];
  }
  if (!canTagAgents(request.authUser?.role)) {
    throw new UnauthorizedError("Only NGO users and staff can tag NGOs.");
  }
  const { query } = await taggableAgentsQuery(request, postAgentId);
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
    where: {
      agentId: In(agentIds),
      status: AgentMembershipStatus.ACTIVE,
      person: { users: { isActive: true } },
    },
    relations: ["person"],
  });
  return mergePersons(members.map((m) => m.person).filter(Boolean));
}

export function mergePersons(...groups: Person[][]): Person[] {
  const byId = new Map<number, Person>();
  groups.flat().forEach((person) => byId.set(person.id, person));
  return [...byId.values()];
}
