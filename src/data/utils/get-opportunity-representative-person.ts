import Opportunity from "../entity/opportunity/opportunity.entity";
import Person from "../entity/person.entity";

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
