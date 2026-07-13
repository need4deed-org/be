import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import { TRUTHY } from "../../config/constants";
import logger from "../../logger";
import {
  berlinToday,
  isGermanPublicHoliday,
} from "../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../services/jobs/scan-accompany-not-found";
import { scanPostMatchCheckup } from "../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../services/jobs/scan-stale-pending";
import { runWithAdvisoryLock } from "../utils";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240701;

async function schedulerPlugin(fastify: FastifyInstance): Promise<void> {
  // Hourly on the hour, 08:00–19:00 Berlin time, weekdays only.
  // node-cron handles DST automatically when timezone is set.
  const task = cron.schedule(
    "0 8-19 * * 1-5",
    async () => {
      try {
        if (TRUTHY.has(process.env.NOTIFY_CRON_MUTED ?? "")) {
          logger.info("scheduler: skipping — NOTIFY_CRON_MUTED is set");
          return;
        }

        if (isGermanPublicHoliday(berlinToday())) {
          logger.info("scheduler: skipping — German public holiday");
          return;
        }

        logger.info("scheduler: running hourly email scans");

        await runWithAdvisoryLock(async () => {
          const results = await Promise.allSettled([
            scanStalePending(fastify),
            scanPostMatchCheckup(fastify),
            scanAccompanyNotFound(fastify),
            scanRegularUpdate(fastify),
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

export default fp(schedulerPlugin, {
  name: "scheduler",
  dependencies: ["typeorm-plugin", "notify"],
});
