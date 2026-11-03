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

export function getOpportunityRepresentativePerson(
  opportunity: Opportunity,
  { includeSubmitter = true }: { includeSubmitter?: boolean } = {},
): Person | undefined {
  const candidates = [
    opportunity.contactPerson,
    includeSubmitter ? opportunity.submittedByPerson : undefined,
    getAgentContactPerson(opportunity.agent),
  ];
  return candidates.find((person) => person?.email) ?? candidates.find(Boolean);
}
