import Opportunity from "../entity/opportunity/opportunity.entity";
import Person from "../entity/person.entity";

// Resolves the single person to notify/contact for an opportunity: the
// submitter, else the legacy contact person (kept for opportunities that
// predate `submittedByPerson`), else the opportunity's agent's current
// representative. Requires `submittedByPerson`, `contactPerson`, and
// `agent.agentPerson.person` to be eager-loaded as needed by the caller.
export function getOpportunityRepresentativePerson(
  opportunity: Opportunity,
): Person | undefined {
  return (
    opportunity.submittedByPerson ??
    opportunity.contactPerson ??
    opportunity.agent?.representative?.person
  );
}
