import {
  berlinToday,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
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

function matchExistsSql(
  volunteerColumn: string,
  status: "activeMatch" | "pastMatch",
  onetimer?: boolean,
): string {
  const typeFilter =
    onetimer === undefined
      ? ""
      : `AND o.type ${onetimer ? "IN" : "NOT IN"} (:...onetimerTypes)`;
  const recent =
    status === "pastMatch"
      ? "JOIN onetimer ot ON ot.id = o.onetimer_id AND ot.date >= :activeSince"
      : "";
  return `EXISTS (
    SELECT 1 FROM opportunity_volunteer ov
    JOIN opportunity o ON o.id = ov.opportunity_id
    ${recent}
    WHERE ov.volunteer_id = ${volunteerColumn}
      AND ov.status = :${status}
      ${typeFilter}
  )`;
}

export const activeMatchSql = (volunteerColumn: string, onetimer?: boolean) =>
  matchExistsSql(volunteerColumn, "activeMatch", onetimer);

export const onetimerHoldSql = (volunteerColumn: string) =>
  matchExistsSql(volunteerColumn, "pastMatch", true);

export const onetimerSqlParameters = (today?: Date) => ({
  activeEngagement: VolunteerStateEngagementType.ACTIVE,
  activeMatch: OpportunityVolunteerStatusType.ACTIVE,
  pastMatch: OpportunityVolunteerStatusType.PAST,
  onetimerTypes: ONETIMER_OPPORTUNITY_TYPES,
  activeSince: onetimerActiveSince(today),
});

export function hasRecentOnetimerMatch(
  manager: EntityManager,
  volunteerId: number,
  today?: Date,
): Promise<boolean> {
  return manager
    .createQueryBuilder(Volunteer, "volunteer")
    .where("volunteer.id = :volunteerId", { volunteerId })
    .andWhere(onetimerHoldSql("volunteer.id"))
    .setParameters(onetimerSqlParameters(today))
    .getExists();
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
    .andWhere("volunteer.status_engagement = :activeEngagement")
    .andWhere(`NOT ${activeMatchSql("volunteer.id", false)}`)
    .andWhere(
      `(${activeMatchSql("volunteer.id", true)} OR ${onetimerHoldSql("volunteer.id")})`,
    )
    .setParameters(onetimerSqlParameters(today))
    .getRawMany();
  return new Set(rows.map(({ id }) => Number(id)));
}
