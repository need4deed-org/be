import {
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";

export function resolveOpportunityMatchStatus(
  volunteers: { status: OpportunityVolunteerStatusType }[],
): OpportunityMatchStatusType {
  const hasMatched = volunteers.some(
    (v) =>
      v.status === OpportunityVolunteerStatusType.MATCHED ||
      v.status === OpportunityVolunteerStatusType.ACTIVE,
  );
  const hasPending = volunteers.some(
    (v) => v.status === OpportunityVolunteerStatusType.PENDING,
  );
  const hasPast = volunteers.some(
    (v) => v.status === OpportunityVolunteerStatusType.PAST,
  );

  if (hasMatched) return OpportunityMatchStatusType.MATCHED;
  if (hasPending) return OpportunityMatchStatusType.PENDING_MATCH;
  if (hasPast) return OpportunityMatchStatusType.PAST;
  return OpportunityMatchStatusType.NO_MATCHES;
}

export function resolveOpportunityStatus(
  volunteers: { status: OpportunityVolunteerStatusType }[],
  currentStatus: OpportunityStatusType,
): OpportunityStatusType {
  const hasActive = volunteers.some(
    (v) => v.status === OpportunityVolunteerStatusType.ACTIVE,
  );
  const hasPendingOrMatched = volunteers.some(
    (v) =>
      v.status === OpportunityVolunteerStatusType.PENDING ||
      v.status === OpportunityVolunteerStatusType.MATCHED,
  );

  if (hasActive) return OpportunityStatusType.ACTIVE;
  if (hasPendingOrMatched && currentStatus === OpportunityStatusType.NEW) {
    return OpportunityStatusType.SEARCHING;
  }
  return currentStatus;
}
