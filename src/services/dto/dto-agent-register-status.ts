import { ApiAgentRegisterStatus } from "need4deed-sdk";
import AgentPerson from "../../data/entity/m2m/agent-person";

export function dtoAgentRegisterStatus(
  membership: AgentPerson | null,
): ApiAgentRegisterStatus {
  return membership
    ? {
        registered: true,
        agentId: membership.agentId,
        agentTitle: membership.agent.title,
        membershipStatus: membership.status,
      }
    : { registered: false };
}
