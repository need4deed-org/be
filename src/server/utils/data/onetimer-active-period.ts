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

export const ONETIMER_HOLD_RULE_START = new Date("2026-10-12T00:00:00+02:00");

export function onetimerActiveSince(today: Date = berlinToday()): Date {
  return berlinDayBoundaries(addDays(today, -ONETIMER_ACTIVE_PERIOD_DAYS))
    .startOfDay;
}

const matchesFromSql = (
  volunteerColumn: string,
  status: "activeMatch" | "pastMatch",
  types?: "onetimer" | "regular",
) => `FROM opportunity_volunteer ov
    JOIN opportunity o ON o.id = ov.opportunity_id
    ${types === "onetimer" ? "JOIN onetimer ot ON ot.id = o.onetimer_id" : ""}
    WHERE ov.volunteer_id = ${volunteerColumn}
      AND ov.status = :${status}
      ${types ? `AND o.type ${types === "onetimer" ? "IN" : "NOT IN"} (:...onetimerTypes)` : ""}`;

const onetimerFromSql = (
  volunteerColumn: string,
  status: "activeMatch" | "pastMatch",
) => matchesFromSql(volunteerColumn, status, "onetimer");

export const anyActiveMatchSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${matchesFromSql(volunteerColumn, "activeMatch")})`;

export const activeRegularMatchSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${matchesFromSql(volunteerColumn, "activeMatch", "regular")})`;

export const activeOnetimerMatchSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${onetimerFromSql(volunteerColumn, "activeMatch")})`;

export const pastOnetimerMatchSql = (volunteerColumn: string, since?: string) =>
  `EXISTS (SELECT 1 ${onetimerFromSql(volunteerColumn, "pastMatch")} ${since ? `AND ot.date >= :${since}` : ""})`;

export const onetimerHoldSql = (volunteerColumn: string) =>
  `EXISTS (SELECT 1 ${onetimerFromSql(volunteerColumn, "pastMatch")} AND ot.date >= :activeSince AND ot.date <= :endOfToday)`;

export const handSetActiveSinceOnetimerSql = (volunteerColumn: string) =>
  `COALESCE((
    SELECT latest.actor_user_id IS NOT NULL
      AND latest.detail LIKE :toActive
      AND latest.occurred_at >= (SELECT max(ot.date) ${onetimerFromSql(volunteerColumn, "pastMatch")})
    FROM (
      SELECT al.actor_user_id, al.detail, al.occurred_at
      FROM volunteer_audit_log al
      WHERE al.volunteer_id = ${volunteerColumn} AND al.type = 'availability_changed'
      ORDER BY al.occurred_at DESC, al.id DESC
      LIMIT 1
    ) latest
  ), false)`;

export const onetimerSqlParameters = (today?: Date) => ({
  activeEngagement: VolunteerStateEngagementType.ACTIVE,
  activeMatch: OpportunityVolunteerStatusType.ACTIVE,
  pastMatch: OpportunityVolunteerStatusType.PAST,
  onetimerTypes: ONETIMER_OPPORTUNITY_TYPES,
  activeSince: onetimerActiveSince(today),
  endOfToday: berlinDayBoundaries(today ?? berlinToday()).endOfDay,
  holdRuleStart: ONETIMER_HOLD_RULE_START,
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
    .andWhere(`NOT ${activeRegularMatchSql("volunteer.id")}`)
    .andWhere(
      `(${activeOnetimerMatchSql("volunteer.id")} OR ${onetimerHoldSql("volunteer.id")})`,
    )
    .andWhere(`NOT ${handSetActiveSinceOnetimerSql("volunteer.id")}`)
    .setParameters(onetimerSqlParameters(today))
    .getRawMany();
  return new Set(rows.map(({ id }) => Number(id)));
}
