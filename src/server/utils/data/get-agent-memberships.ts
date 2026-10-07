import { AgentMembershipStatus } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import { getRepository } from "../../../data/utils";

export async function getActiveAgentMemberships(
  personId: number,
  agentId?: number,
): Promise<AgentPerson[]> {
  const agentPersonRepository = getRepository(dataSource, AgentPerson);
  return agentPersonRepository.find({
    where: {
      personId,
      status: AgentMembershipStatus.ACTIVE,
      ...(agentId ? { agentId } : {}),
    },
    relations: ["agent"],
    order: { id: "ASC" },
  });
}
