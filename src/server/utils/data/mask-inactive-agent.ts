import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { maskFields, PERSON_PII_FIELDS } from "../pii/mask";

// An INACTIVE agent's opportunities/volunteers shouldn't read as live,
// actionable data (be#885), for anyone but coordinator/admin. Read live off
// engagementStatus (never snapshotted), so flipping the agent back to ACTIVE
// unmasks its next load immediately. Shared by GET /agent/:id/opportunity-linked,
// GET /agent/:id/volunteer-linked and GET /opportunity/:id/volunteer-linked —
// all three surface the same underlying volunteer-identity rows.
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

// Masks each linked volunteer's identity in place. Tolerates a null/undefined
// element itself (not just a missing nested volunteer/person) — a multi-relation
// findOne joining several sibling one-to-many collections in one query can
// hydrate nulls into an array like this (dtoAgentOpportunity's own
// `.filter(Boolean)` on the same relation exists for the same reason), so
// callers don't each need to remember to pre-filter.
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
