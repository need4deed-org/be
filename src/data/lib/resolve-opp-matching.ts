import {
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";

export function resolveOpportunityMatchStatus(
  volunteers: { status: OpportunityVolunteerStatusType }[],
  numberNeeded: number,
): OpportunityMatchStatusType {
  const active = volunteers.filter(
    (v) => v.status === OpportunityVolunteerStatusType.ACTIVE,
  ).length;
  const matched = volunteers.filter(
    (v) => v.status === OpportunityVolunteerStatusType.MATCHED,
  ).length;
  const pending = volunteers.filter(
    (v) => v.status === OpportunityVolunteerStatusType.PENDING,
  ).length;

  if (active > 0 && active < numberNeeded) return OpportunityMatchStatusType.PAST;
  if (matched > 0) return OpportunityMatchStatusType.MATCHED;
  if (pending > 0) return OpportunityMatchStatusType.PENDING_MATCH;
  return OpportunityMatchStatusType.NO_MATCHES;
}

export function resolveOpportunityStatus(
  volunteers: { status: OpportunityVolunteerStatusType }[],
  currentStatus: OpportunityStatusType,
): OpportunityStatusType {
  const hasActive = volunteers.some(
    (v) => v.status === OpportunityVolunteerStatusType.ACTIVE,
  );
  if (hasActive) return OpportunityStatusType.ACTIVE;
  return currentStatus;
}
