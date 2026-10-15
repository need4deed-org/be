import { FastifyInstance } from "fastify";
import logger from "../../logger";

export async function reportCronFailure(
  fastify: FastifyInstance,
  job: string,
  item: string,
  err: unknown,
  outcome = "not posted to #cron-notifications",
): Promise<void> {
  const reason = err instanceof Error ? err.message : String(err);
  logger.error(`${job}: ${item} failed: ${reason}`);
  await fastify.notify.opsAlert(
    `Cron ${job}: ${item} ${outcome}: ${reason}. Follow up by hand.`,
  );
}
