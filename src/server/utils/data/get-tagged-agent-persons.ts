import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { BadRequestError, UnauthorizedError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import { getTaggedAgentIds } from "./attach-tagged-agents";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { isStaffRole } from "./is-staff-role";
import { validateRelationIds } from "./validate-relation-ids";

export function resolveTaggedAgentIds(
  text: string,
  taggedAgentIds?: number[] | null,
): number[] {
  const tokenIds = getTaggedAgentIds(text);
  if (taggedAgentIds) {
    const requested = new Set(taggedAgentIds);
    if (
      requested.size !== tokenIds.length ||
      tokenIds.some((id) => !requested.has(id))
    ) {
      throw new BadRequestError(
        "taggedAgentIds must match the <@agent:ID> tokens in the text.",
      );
    }
  }
  return tokenIds;
}

export async function assertTaggableAgents(
  request: FastifyRequest,
  agentIds: number[],
): Promise<void> {
  if (agentIds.length === 0) {
    return;
  }
  const role = request.authUser?.role;
  if (role !== UserRole.AGENT && !isStaffRole(role)) {
    throw new UnauthorizedError("Only NGO users and staff can tag NGOs.");
  }
  const ownAgentIds = await getCallerAgentIds(
    request,
    request.authUser?.personId,
  );
  const taggable = await request.server.db.agentRepository
    .createQueryBuilder("agent")
    .select("agent.id")
    .where("agent.id IN (:...agentIds)", { agentIds })
    .andWhere("agent.unclaimed = false")
    .andWhere(
      "(agent.engagementStatus IS NULL OR agent.engagementStatus != :inactive)",
      { inactive: AgentEngagementStatusType.INACTIVE },
    )
    .andWhere(
      ownAgentIds.length ? "agent.id NOT IN (:...ownAgentIds)" : "1=1",
      {
        ownAgentIds,
      },
    )
    .getMany();
  validateRelationIds(agentIds, taggable, "tagged agent");
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
