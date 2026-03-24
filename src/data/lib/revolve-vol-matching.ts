import {
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";

export function resolveVolunteerMatchStatus(
  currentStatus: VolunteerStateMatchType,
  opportunities: OpportunityVolunteerStatusType[],
): VolunteerStateMatchType {
  const hasMatched = opportunities.some(
    (s) => s === OpportunityVolunteerStatusType.MATCHED,
  );
  const hasActive = opportunities.some(
    (s) => s === OpportunityVolunteerStatusType.ACTIVE,
  );
  const hasPending = opportunities.some(
    (s) => s === OpportunityVolunteerStatusType.PENDING,
  );

  // Rule 5 & 4: matched or active opportunities → MATCHED
  if (hasMatched || hasActive) {
    return VolunteerStateMatchType.MATCHED;
  }

  // Rule 2: only pending opportunities → PENDING_MATCH
  if (hasPending) {
    return VolunteerStateMatchType.PENDING_MATCH;
  }

  // Rule 6: no matched/active, and volunteer was previously engaged → NEEDS_REMATCH
  if (currentStatus !== VolunteerStateMatchType.NO_MATCHES) {
    return VolunteerStateMatchType.NEEDS_REMATCH;
  }

  // Rule 1: brand new volunteer with no opportunities
  return VolunteerStateMatchType.NO_MATCHES;
}
