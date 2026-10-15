import { FastifyInstance } from "fastify";
import logger from "../../logger";
import { deleteDeadRefreshSessions } from "../../server/utils/data/refresh-session";

export async function pruneRefreshSessions(
  fastify: FastifyInstance,
): Promise<void> {
  const deleted = await deleteDeadRefreshSessions(
    fastify.db.refreshSessionRepository.manager,
  );
  logger.info(`scheduler: pruned ${deleted} dead refresh sessions`);
}
