import { AgentMembershipStatus, AgentRoleType } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import { getRepository } from "../../../data/utils";

export async function getAgentPersonRepresentative(
  personId: number,
): Promise<AgentPerson | null> {
  const agentPersonRepository = getRepository(dataSource, AgentPerson);
  const representative =
    (await agentPersonRepository.findOne({
      where: {
        personId,
        status: AgentMembershipStatus.ACTIVE,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      },
      order: { id: "ASC" },
    })) ??
    (await agentPersonRepository.findOne({
      where: {
        personId,
        status: AgentMembershipStatus.ACTIVE,
      },
      order: { id: "ASC" },
    }));

  return representative;
}
