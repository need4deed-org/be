import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import logger from "../../logger";
import {
  berlinToday,
  isGermanPublicHoliday,
} from "../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../services/jobs/scan-accompany-not-found";
import { scanPostMatchCheckup } from "../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../services/jobs/scan-stale-pending";
import { isCronMuted, runNamedCronJobs, runWithAdvisoryLock } from "../utils";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240701;

// Hourly on the hour, 08:00–19:00 Berlin time, weekdays only, by default.
const CRON_SCHEDULE_HOURLY =
  process.env.CRON_SCHEDULE_HOURLY || "0 8-19 * * 1-5";

async function schedulerHourlyPlugin(fastify: FastifyInstance): Promise<void> {
  // node-cron handles DST automatically when timezone is set.
  const task = cron.schedule(
    CRON_SCHEDULE_HOURLY,
    async () => {
      try {
        if (isCronMuted()) {
          logger.info("scheduler: skipping hourly scans — cron muted");
          return;
        }

        if (isGermanPublicHoliday(berlinToday())) {
          logger.info("scheduler: skipping — German public holiday");
          return;
        }

        logger.info("scheduler: running hourly email scans");

        await runWithAdvisoryLock(
          () =>
            runNamedCronJobs([
              {
                name: "scanStalePending",
                run: () => scanStalePending(fastify),
              },
              {
                name: "scanPostMatchCheckup",
                run: () => scanPostMatchCheckup(fastify),
              },
              {
                name: "scanAccompanyNotFound",
                run: () => scanAccompanyNotFound(fastify),
              },
              {
                name: "scanRegularUpdate",
                run: () => scanRegularUpdate(fastify),
              },
            ]),
          SCHEDULER_LOCK_ID,
        );
      } catch (err) {
        logger.error({ err }, "scheduler: unhandled error in cron callback");
      }
    },
    { timezone: "Europe/Berlin" },
  );

  fastify.addHook("onClose", () => task.stop());
}

export default fp(schedulerHourlyPlugin, {
  name: "scheduler-hourly",
  dependencies: ["typeorm-plugin", "notify"],
});
