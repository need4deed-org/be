import { FastifyInstance } from "fastify";
import logger from "../../logger";
import { deleteExpiredRefreshSessions } from "../../server/utils/data/refresh-session";

export async function pruneRefreshSessions(
  fastify: FastifyInstance,
): Promise<void> {
  const deleted = await deleteExpiredRefreshSessions(
    fastify.db.refreshSessionRepository.manager,
  );
  logger.info(`scheduler: pruned ${deleted} expired refresh sessions`);
}
