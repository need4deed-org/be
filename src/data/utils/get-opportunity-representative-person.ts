import Opportunity from "../entity/opportunity/opportunity.entity";
import Person from "../entity/person.entity";

// Resolves the person to notify/contact for an opportunity: the stored
// contact person (the authoritative value — set at creation or via a manual
// relink, be#824), else the submitter, else the opportunity's agent's
// current representative. Requires `submittedByPerson`, `contactPerson`, and
// `agent.agentPerson.person` to be eager-loaded as needed by the caller.
//
// contactPerson is checked first (be#833): it's the one value here that's
// either explicitly set or deliberately corrected by staff, so it must win
// over the submitter and can't be allowed to drift with agent.representative
// — a live, unstable value that changes as soon as the agent's contact list
// changes, which would otherwise silently redirect notifications for old
// opportunities to whoever was just added.
//
// Prefers whichever candidate actually has an email over just the first
// non-null one: a person can have no email of its own (e.g. an internal
// coordinator account, whose email lives on their User row, not their Person
// row) — in that case we still want to fall through to someone we can
// actually reach.
export function getOpportunityRepresentativePerson(
  opportunity: Opportunity,
): Person | undefined {
  const candidates = [
    opportunity.contactPerson,
    opportunity.submittedByPerson,
    opportunity.agent?.representative?.person,
  ];
  return candidates.find((person) => person?.email) ?? candidates.find(Boolean);
}
