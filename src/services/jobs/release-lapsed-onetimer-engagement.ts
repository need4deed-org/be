import { FastifyInstance } from "fastify";
import { berlinToday, VolunteerStateEngagementType } from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import VolunteerAuditLog from "../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import logger from "../../logger";
import { engagementChangeDetail } from "../../server/utils/data/engagement-change-detail";
import {
  activeMatchSql,
  handSetActiveSinceOnetimerSql,
  onetimerHoldSql,
  onetimerSqlParameters,
  pastOnetimerMatchSql,
} from "../../server/utils/data/onetimer-active-period";

const { ACTIVE, AVAILABLE } = VolunteerStateEngagementType;

const lapsedWhere = `volunteer.status_engagement = :activeEngagement
  AND NOT ${activeMatchSql("volunteer.id")}
  AND NOT ${onetimerHoldSql("volunteer.id")}
  AND ${pastOnetimerMatchSql("volunteer.id")}
  AND NOT ${handSetActiveSinceOnetimerSql("volunteer.id")}`;

async function releaseLapsed(
  manager: EntityManager,
  today: Date,
  volunteerIds?: number[],
): Promise<number[]> {
  const parameters = onetimerSqlParameters(today);
  const candidates = manager
    .createQueryBuilder(Volunteer, "volunteer")
    .select("volunteer.id", "id")
    .where(lapsedWhere);
  if (volunteerIds) {
    candidates.andWhere({ id: In(volunteerIds) });
  }
  const locked: { id: number }[] = await candidates
    .setParameters(parameters)
    .orderBy("volunteer.id")
    .setLock("for_no_key_update")
    .getRawMany();
  if (!locked.length) {
    return [];
  }
  const { raw } = await manager
    .createQueryBuilder()
    .update(Volunteer)
    .set({ statusEngagement: AVAILABLE })
    .where({ id: In(locked.map(({ id }) => id)) })
    .andWhere(lapsedWhere)
    .setParameters(parameters)
    .returning(["id"])
    .execute();
  const ids = (raw as { id: number }[]).map(({ id }) => id);
  if (ids.length) {
    const occurredAt = new Date();
    await manager.insert(
      VolunteerAuditLog,
      ids.map((volunteerId) => ({
        volunteerId,
        type: "availability_changed" as const,
        detail: engagementChangeDetail(ACTIVE, AVAILABLE),
        occurredAt,
      })),
    );
  }
  return ids;
}

export async function releaseLapsedOnetimerEngagement(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
  volunteerIds?: number[],
): Promise<void> {
  const released = await fastify.db.volunteerRepository.manager.transaction(
    (manager) => releaseLapsed(manager, today, volunteerIds),
  );
  if (released.length) {
    logger.info(
      `releaseLapsedOnetimerEngagement: released ${released.length} volunteer(s)`,
    );
  }
}
