import { FastifyInstance } from "fastify";
import logger from "../../logger";

export async function reportCronFailure(
  fastify: FastifyInstance,
  job: string,
  item: string,
  err: unknown,
): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err);
  logger.error(`${job}: ${item} failed: ${reason}`);
  await fastify.notify.opsAlert(
    `Cron ${job}: ${item} not posted to #cron-notifications: ${reason}. Follow up by hand.`,
  );
}
