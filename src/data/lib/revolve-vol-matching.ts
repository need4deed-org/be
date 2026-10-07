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

  if (hasMatched || hasActive) {
    return VolunteerStateMatchType.MATCHED;
  }

  if (hasPending) {
    return VolunteerStateMatchType.PENDING_MATCH;
  }

  if (currentStatus !== VolunteerStateMatchType.NO_MATCHES) {
    return VolunteerStateMatchType.NEEDS_REMATCH;
  }

  return VolunteerStateMatchType.NO_MATCHES;
}
