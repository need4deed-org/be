import { FastifyInstance } from "fastify";
import { AgentMembershipStatus } from "need4deed-sdk";
import { In } from "typeorm";
import Person from "../../../data/entity/person.entity";
import { validateRelationIds } from "./validate-relation-ids";

export async function getTaggedAgentPersons(
  fastify: FastifyInstance,
  agentIds: number[],
): Promise<Person[]> {
  if (agentIds.length === 0) {
    return [];
  }
  const agents = await fastify.db.agentRepository.find({
    select: { id: true },
    where: { id: In(agentIds) },
  });
  validateRelationIds(agentIds, agents, "tagged agent");

  const members = await fastify.db.agentPersonRepository.find({
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
