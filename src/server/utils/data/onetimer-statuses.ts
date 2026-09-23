import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";

// Single source of truth for the two onetimer jobs' status assumptions —
// previously each job hand-duplicated its own version of these lists, which
// had already drifted out of sync once (be#987 review).

// An onetimer opportunity that has reached one of these has nothing left for
// either job to do with it. activateDueOnetimers additionally excludes
// ACTIVE (it only promotes MATCHED -> ACTIVE), while scanExpiredOnetimers
// must still match ACTIVE opportunities so it can finalize them to PAST.
export const ONETIMER_TERMINAL_OPPORTUNITY_STATUSES: OpportunityStatusType[] = [
  OpportunityStatusType.INACTIVE,
  OpportunityStatusType.PAST,
];

// activateDueOnetimers may have already promoted a matched volunteer to
// ACTIVE by the time scanExpiredOnetimers revisits the opportunity, so both
// statuses count as "was engaged" for deciding PAST vs INACTIVE.
export const ONETIMER_ENGAGED_VOLUNTEER_STATUSES: OpportunityVolunteerStatusType[] =
  [
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
  ];
