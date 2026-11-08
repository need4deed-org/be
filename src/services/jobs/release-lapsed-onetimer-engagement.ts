import { FastifyInstance } from "fastify";
import { berlinToday, VolunteerStateEngagementType } from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import VolunteerAuditLog from "../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import logger from "../../logger";
import {
  buildLapsedHoldQuery,
  lapsedHoldWhere,
} from "../../server/utils/data/build-lapsed-hold-query";
import { engagementChangeDetail } from "../../server/utils/data/engagement-change-detail";
import { onetimerSqlParameters } from "../../server/utils/data/onetimer-active-period";

const { ACTIVE, AVAILABLE } = VolunteerStateEngagementType;

async function releaseLapsed(
  manager: EntityManager,
  today: Date,
): Promise<number[]> {
  const parameters = onetimerSqlParameters(today);
  const locked: { id: number }[] = await buildLapsedHoldQuery(manager)
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
    .andWhere(lapsedHoldWhere)
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
): Promise<void> {
  const released = await fastify.db.volunteerRepository.manager.transaction(
    (manager) => releaseLapsed(manager, today),
  );
  if (released.length) {
    logger.info(
      { volunteerIds: released },
      `releaseLapsedOnetimerEngagement: released ${released.length} volunteer(s)`,
    );
  }
}
