import { AgentMembershipStatus } from "need4deed-sdk";
import Agent from "../entity/opportunity/agent.entity";
import Opportunity from "../entity/opportunity/opportunity.entity";
import Person from "../entity/person.entity";

export const AGENT_CONTACT_RELATIONS = [
  "agent",
  "agent.agentPerson",
  "agent.agentPerson.person",
];

export function getAgentContactPerson(agent?: Agent): Person | undefined {
  const representative = agent?.representative?.person;
  if (representative?.email) {
    return representative;
  }
  return (
    agent?.agentPerson?.find(
      ({ status, person }) =>
        status === AgentMembershipStatus.ACTIVE && person?.email,
    )?.person ?? representative
  );
}

// A submitter only speaks for the NGO while they are an active member of it:
// staff creating on an NGO's behalf (fe#1257) or ex-members are skipped, and
// without loaded memberships there is nothing to verify, so skip too (be#1368).
function isActiveAgentMember(agent: Agent | undefined, person?: Person) {
  return (
    person !== undefined &&
    (agent?.agentPerson ?? []).some(
      ({ status, personId, person: memberPerson }) =>
        status === AgentMembershipStatus.ACTIVE &&
        (personId ?? memberPerson?.id) === person.id,
    )
  );
}

export function getOpportunityRepresentativePerson(
  opportunity: Opportunity,
  { includeSubmitter = true }: { includeSubmitter?: boolean } = {},
): Person | undefined {
  const candidates = [
    opportunity.contactPerson,
    includeSubmitter &&
    isActiveAgentMember(opportunity.agent, opportunity.submittedByPerson)
      ? opportunity.submittedByPerson
      : undefined,
    getAgentContactPerson(opportunity.agent),
  ];
  return candidates.find((person) => person?.email) ?? candidates.find(Boolean);
}
