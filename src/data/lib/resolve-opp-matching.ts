import {
  OpportunityMatchStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";

export function resolveOpportunityMatchStatus(
  currentStatus: OpportunityMatchStatusType,
  volunteers: OpportunityVolunteerStatusType[],
): OpportunityMatchStatusType {
  const hasMatched = volunteers.some(
    (s) => s === OpportunityVolunteerStatusType.MATCHED,
  );
  const hasActive = volunteers.some(
    (s) => s === OpportunityVolunteerStatusType.ACTIVE,
  );
  const hasPending = volunteers.some(
    (s) => s === OpportunityVolunteerStatusType.PENDING,
  );

  if (hasMatched || hasActive) {
    return OpportunityMatchStatusType.MATCHED;
  }

  if (hasPending) {
    return OpportunityMatchStatusType.PENDING_MATCH;
  }

  if (currentStatus !== OpportunityMatchStatusType.NO_MATCHES) {
    return OpportunityMatchStatusType.NEEDS_REMATCH;
  }

  return OpportunityMatchStatusType.NO_MATCHES;
}
