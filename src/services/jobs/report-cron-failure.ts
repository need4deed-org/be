import { FastifyInstance } from "fastify";
import logger from "../../logger";

/**
 * Logs a cron scan's failure for one item and alerts ops (be#982): each
 * opportunity or match comes up on one run only (be#1088), so a failed post
 * — e.g. a recipient without an email — is otherwise lost for good. The
 * alert names only the job and the item, no personal data.
 */
export async function reportCronFailure(
  fastify: FastifyInstance,
  job: string,
  item: string,
  err: unknown,
): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err);
  logger.error(`${job}: ${item} failed: ${reason}`);
  await fastify.notify.opsAlert(
    `Cron ${job}: ${item} not posted to #cron-notifications — ${reason}. Fix the data and follow up by hand.`,
  );
}
