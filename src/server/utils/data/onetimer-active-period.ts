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
import { engagementChangeDetail } from "./engagement-change-detail";
import { ONETIMER_OPPORTUNITY_TYPES } from "./onetimer-statuses";

export const ONETIMER_ACTIVE_PERIOD_DAYS = 28;

export function onetimerActiveSince(today: Date = berlinToday()): Date {
  return berlinDayBoundaries(addDays(today, -ONETIMER_ACTIVE_PERIOD_DAYS))
    .startOfDay;
}

const matchesFromSql = (
  volunteerColumn: string,
  status: "activeMatch" | "pastMatch",
  onetimer?: boolean,
) => `FROM opportunity_volunteer ov
    JOIN opportunity o ON o.id = ov.opportunity_id
    LEFT JOIN onetimer ot ON ot.id = o.onetimer_id
    WHERE ov.volunteer_id = ${volunteerColumn}
      AND ov.status = :${status}
      ${onetimer === undefined ? "" : `AND o.type ${onetimer ? "IN" : "NOT IN"} (:...onetimerTypes)`}`;

export const activeMatchSql = (volunteerColumn: string, onetimer?: boolean) =>
  `EXISTS (SELECT 1 ${matchesFromSql(volunteerColumn, "activeMatch", onetimer)})`;

export const pastOnetimerMatchSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${matchesFromSql(volunteerColumn, "pastMatch", true)})`;

export const onetimerHoldSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${matchesFromSql(volunteerColumn, "pastMatch", true)} AND ot.date >= :activeSince)`;

export const handSetActiveSinceOnetimerSql = (volunteerColumn: string) =>
  `COALESCE((
    SELECT al.actor_user_id IS NOT NULL
      AND al.detail LIKE :toActive
      AND al.occurred_at >= (SELECT max(ot.date) ${matchesFromSql(volunteerColumn, "pastMatch", true)})
    FROM volunteer_audit_log al
    WHERE al.volunteer_id = ${volunteerColumn} AND al.type = 'availability_changed'
    ORDER BY al.occurred_at DESC, al.id DESC
    LIMIT 1
  ), false)`;

export const onetimerSqlParameters = (today?: Date) => ({
  activeEngagement: VolunteerStateEngagementType.ACTIVE,
  activeMatch: OpportunityVolunteerStatusType.ACTIVE,
  pastMatch: OpportunityVolunteerStatusType.PAST,
  onetimerTypes: ONETIMER_OPPORTUNITY_TYPES,
  activeSince: onetimerActiveSince(today),
  toActive: engagementChangeDetail("%", VolunteerStateEngagementType.ACTIVE),
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
    .andWhere(`NOT ${handSetActiveSinceOnetimerSql("volunteer.id")}`)
    .setParameters(onetimerSqlParameters(today))
    .getRawMany();
  return new Set(rows.map(({ id }) => Number(id)));
}
