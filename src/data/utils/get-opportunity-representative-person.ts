import Opportunity from "../entity/opportunity/opportunity.entity";
import Person from "../entity/person.entity";

// Resolves the person to notify/contact for an opportunity: the submitter,
// else the legacy contact person (kept for opportunities that predate
// `submittedByPerson`), else the opportunity's agent's current
// representative. Requires `submittedByPerson`, `contactPerson`, and
// `agent.agentPerson.person` to be eager-loaded as needed by the caller.
//
// Prefers whichever candidate actually has an email over just the first
// non-null one: a submitter can be a Person with no email of its own (e.g.
// an internal coordinator account, whose email lives on their User row, not
// their Person row) — in that case we still want to fall through to a
// representative we can actually reach.
export function getOpportunityRepresentativePerson(
  opportunity: Opportunity,
): Person | undefined {
  const candidates = [
    opportunity.submittedByPerson,
    opportunity.contactPerson,
    opportunity.agent?.representative?.person,
  ];
  return candidates.find((person) => person?.email) ?? candidates.find(Boolean);
}
