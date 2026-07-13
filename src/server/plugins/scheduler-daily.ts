import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import logger from "../../logger";
import { scanExpiredOnetimers } from "../../services/jobs/scan-expired-onetimers";
import { runWithAdvisoryLock } from "../utils";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240707;

async function schedulerDailyPlugin(fastify: FastifyInstance): Promise<void> {
  // Daily at the 6AM hour Berlin time, weekdays only.
  // node-cron handles DST automatically when timezone is set.
  const task = cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        logger.info("scheduler: running daily scans");

        await runWithAdvisoryLock(async () => {
          const results = await Promise.allSettled([
            scanExpiredOnetimers(fastify),
          ]);

          for (const r of results) {
            if (r.status === "rejected") {
              logger.error({ err: r.reason }, "scheduler: scan failed");
            }
          }
        }, SCHEDULER_LOCK_ID);
      } catch (err) {
        logger.error({ err }, "scheduler: unhandled error in cron callback");
      }
    },
    { timezone: "Europe/Berlin" },
  );

  fastify.addHook("onClose", () => task.stop());
}

export default fp(schedulerDailyPlugin, {
  name: "scheduler",
  dependencies: ["typeorm-plugin", "notify"],
});
