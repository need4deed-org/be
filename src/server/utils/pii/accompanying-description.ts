import {
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { VISIBLE_MATCH_STATUSES } from "./visible-persons";

export function canSeeOpportunityDescription(
  opportunityType: OpportunityType,
  role: UserRole | undefined,
  matchStatus: OpportunityVolunteerStatusType | null | undefined,
): boolean {
  if (opportunityType !== OpportunityType.ACCOMPANYING) {
    return true;
  }
  switch (role) {
    case UserRole.COORDINATOR:
    case UserRole.ADMIN:
    case UserRole.AGENT:
      return true;
    case UserRole.VOLUNTEER:
      return Boolean(
        matchStatus && VISIBLE_MATCH_STATUSES.includes(matchStatus),
      );
    default:
      return false;
  }
}
