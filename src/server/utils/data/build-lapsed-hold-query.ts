import { EntityManager, SelectQueryBuilder } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  anyActiveMatchSql,
  handSetActiveSinceOnetimerSql,
  onetimerHoldSql,
  pastOnetimerMatchSql,
} from "./onetimer-active-period";

export const lapsedHoldWhere = `volunteer.status_engagement = :activeEngagement
  AND NOT ${anyActiveMatchSql("volunteer.id")}
  AND NOT ${onetimerHoldSql("volunteer.id")}
  AND ${pastOnetimerMatchSql("volunteer.id", "holdRuleStart")}
  AND NOT ${handSetActiveSinceOnetimerSql("volunteer.id")}`;

export function buildLapsedHoldQuery(
  manager: EntityManager,
): SelectQueryBuilder<Volunteer> {
  return manager
    .createQueryBuilder(Volunteer, "volunteer")
    .select("volunteer.id", "id")
    .where(lapsedHoldWhere);
}
