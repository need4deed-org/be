import {
  berlinToday,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { Raw } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import {
  appointmentsDue,
  berlinDayBoundaries,
} from "../../../services/jobs/berlin-dates";
import { ONETIMER_ENGAGED_VOLUNTEER_STATUSES } from "./onetimer-statuses";

export const NO_MATCH_FOUND_WORKING_DAYS = 4;

const MATCHED_VOLUNTEER_STATUSES = [
  ...ONETIMER_ENGAGED_VOLUNTEER_STATUSES,
  OpportunityVolunteerStatusType.PAST,
];

export function noMatchFoundCutoff(today: Date = berlinToday()): Date {
  return appointmentsDue(today, NO_MATCH_FOUND_WORKING_DAYS).to;
}

export function isNoMatchFound(
  opportunity: Opportunity,
  today: Date = berlinToday(),
): boolean | undefined {
  if (opportunity.type !== OpportunityType.ACCOMPANYING) {
    return false;
  }
  const appointment = opportunity.onetimer?.date;
  if (!appointment || !opportunity.opportunityVolunteer) {
    return undefined;
  }
  return (
    appointment < noMatchFoundCutoff(today) &&
    !opportunity.opportunityVolunteer.some((ov) =>
      MATCHED_VOLUNTEER_STATUSES.includes(ov.status),
    )
  );
}

export function closedForVolunteersIdWhere(today: Date = berlinToday()) {
  return Raw(
    (alias) => `${alias} NOT IN (
      SELECT o.id
        FROM opportunity o
        JOIN onetimer ot ON ot.id = o.onetimer_id
       WHERE (o.type = :closedAccompanyingType AND ot.date < :closedAccompanyingCutoff)
          OR (o.type = :closedEventsType AND ot.date < :closedEventsCutoff))`,
    {
      closedAccompanyingType: OpportunityType.ACCOMPANYING,
      closedAccompanyingCutoff: noMatchFoundCutoff(today),
      closedEventsType: OpportunityType.EVENTS,
      closedEventsCutoff: berlinDayBoundaries(today).startOfDay,
    },
  );
}
