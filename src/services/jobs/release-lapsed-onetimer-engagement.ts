import { FastifyInstance } from "fastify";
import { berlinToday, VolunteerStateEngagementType } from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import VolunteerAuditLog from "../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import logger from "../../logger";
import {
  activeMatchSql,
  onetimerHoldSql,
  onetimerSqlParameters,
} from "../../server/utils/data/onetimer-active-period";

const { ACTIVE, AVAILABLE } = VolunteerStateEngagementType;

// A hand-set Active is logged with an actor; only a system-set one is released.
const lapsedWhere = `volunteer.status_engagement = :activeEngagement
  AND NOT ${activeMatchSql("volunteer.id")}
  AND NOT ${onetimerHoldSql("volunteer.id")}
  AND (
    SELECT al.actor_user_id IS NULL AND al.detail LIKE :toActive
    FROM volunteer_audit_log al
    WHERE al.volunteer_id = volunteer.id AND al.type = 'availability_changed'
    ORDER BY al.occurred_at DESC, al.id DESC
    LIMIT 1
  )`;

async function releaseLapsed(
  manager: EntityManager,
  today: Date,
  volunteerIds?: number[],
): Promise<number[]> {
  const parameters = {
    ...onetimerSqlParameters(today),
    toActive: `% ${ACTIVE}.`,
  };
  const locked: { id: number }[] = await manager
    .createQueryBuilder(Volunteer, "volunteer")
    .select("volunteer.id", "id")
    .where(lapsedWhere)
    .andWhere(volunteerIds ? { id: In(volunteerIds) } : "TRUE")
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
        detail: `Status changed from ${ACTIVE} to ${AVAILABLE}.`,
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
