import { AgentMembershipStatus } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import { getRepository } from "../../../data/utils";

// All of a person's active agent memberships, not just one — a person can
// belong to more than one Agent (be#809), unlike
// getAgentPersonRepresentative's single "primary" pick.
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
