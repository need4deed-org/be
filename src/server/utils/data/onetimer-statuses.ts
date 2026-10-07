import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";

export const ONETIMER_TERMINAL_OPPORTUNITY_STATUSES: OpportunityStatusType[] = [
  OpportunityStatusType.INACTIVE,
  OpportunityStatusType.PAST,
];

export const ONETIMER_ENGAGED_VOLUNTEER_STATUSES: OpportunityVolunteerStatusType[] =
  [
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
  ];
