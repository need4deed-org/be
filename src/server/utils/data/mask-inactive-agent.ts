import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { maskFields, PERSON_PII_FIELDS } from "../pii/mask";

export function shouldMaskInactiveAgentData(
  agent: Pick<Agent, "engagementStatus">,
  role: UserRole | undefined,
): boolean {
  const isPrivileged = role === UserRole.COORDINATOR || role === UserRole.ADMIN;
  return (
    agent.engagementStatus === AgentEngagementStatusType.INACTIVE &&
    !isPrivileged
  );
}

export function maskVolunteerIdentities(
  opportunityVolunteers: (OpportunityVolunteer | null | undefined)[],
): void {
  for (const ov of opportunityVolunteers) {
    if (ov?.volunteer?.person) {
      maskFields(
        ov.volunteer.person as unknown as Record<string, unknown>,
        PERSON_PII_FIELDS,
      );
    }
  }
}
