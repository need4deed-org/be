import {
  berlinToday,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager, In, MoreThanOrEqual } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  addDays,
  berlinDayBoundaries,
} from "../../../services/jobs/berlin-dates";
import { ONETIMER_OPPORTUNITY_TYPES } from "./onetimer-statuses";

export const ONETIMER_ACTIVE_PERIOD_DAYS = 28;

export function onetimerActiveSince(today: Date = berlinToday()): Date {
  return berlinDayBoundaries(addDays(today, -ONETIMER_ACTIVE_PERIOD_DAYS))
    .startOfDay;
}

export function hasRecentOnetimerMatch(
  manager: EntityManager,
  volunteerId: number,
  today?: Date,
): Promise<boolean> {
  return manager.exists(OpportunityVolunteer, {
    where: {
      volunteerId,
      status: OpportunityVolunteerStatusType.PAST,
      opportunity: {
        type: In(ONETIMER_OPPORTUNITY_TYPES),
        onetimer: { date: MoreThanOrEqual(onetimerActiveSince(today)) },
      },
    },
  });
}

export function matchExistsSql(
  volunteerColumn: string,
  {
    status,
    onetimer,
    onetimerSince,
  }: { status: string; onetimer: boolean; onetimerSince?: string },
): string {
  return `EXISTS (
    SELECT 1 FROM opportunity_volunteer ov
    JOIN opportunity o ON o.id = ov.opportunity_id
    ${onetimerSince ? "JOIN onetimer ot ON ot.id = o.onetimer_id" : ""}
    WHERE ov.volunteer_id = ${volunteerColumn}
      AND ov.status = :${status}
      AND o.type ${onetimer ? "IN" : "NOT IN"} (:...onetimerTypes)
      ${onetimerSince ? `AND ot.date >= :${onetimerSince}` : ""}
  )`;
}

export async function findVolunteerIdsActiveFromOnetimer(
  manager: EntityManager,
  volunteerIds: number[],
  today?: Date,
): Promise<Set<number>> {
  if (!volunteerIds.length) {
    return new Set();
  }
  const rows: { id: number }[] = await manager
    .createQueryBuilder(Volunteer, "volunteer")
    .select("volunteer.id", "id")
    .where("volunteer.id IN (:...volunteerIds)", { volunteerIds })
    .andWhere("volunteer.statusEngagement = :activeEngagement")
    .andWhere(
      `NOT ${matchExistsSql("volunteer.id", { status: "activeMatch", onetimer: false })}`,
    )
    .andWhere(
      `(${matchExistsSql("volunteer.id", { status: "activeMatch", onetimer: true })}
        OR ${matchExistsSql("volunteer.id", { status: "pastMatch", onetimer: true, onetimerSince: "activeSince" })})`,
    )
    .setParameters({
      activeEngagement: VolunteerStateEngagementType.ACTIVE,
      activeMatch: OpportunityVolunteerStatusType.ACTIVE,
      pastMatch: OpportunityVolunteerStatusType.PAST,
      onetimerTypes: ONETIMER_OPPORTUNITY_TYPES,
      activeSince: onetimerActiveSince(today),
    })
    .getRawMany();
  return new Set(rows.map(({ id }) => Number(id)));
}
