import {
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { VISIBLE_MATCH_STATUSES } from "./visible-persons";

/**
 * Whether the caller may read an opportunity's description (be#1092). An
 * accompanying opportunity's description is about one person's appointment:
 * only coordinators/admins, the owning agent (GET /opportunity/:id already
 * 404s other agents) and volunteers matched to it (MATCHED/ACTIVE, as for
 * the RAC details in be#1039) see it. Every other type is unrestricted.
 */
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
