import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import logger from "../../logger";
import { activateDueOnetimers } from "../../services/jobs/activate-due-onetimers";
import { berlinToday, isWorkingDay } from "../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../services/jobs/scan-accompany-not-found";
import { scanExpiredOnetimers } from "../../services/jobs/scan-expired-onetimers";
import { scanPostMatchCheckup } from "../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../services/jobs/scan-stale-pending";
import { runNamedCronJobs, runWithAdvisoryLock } from "../utils";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240707;

// Daily at the 6AM hour Berlin time, by default.
const CRON_SCHEDULE_DAILY = process.env.CRON_SCHEDULE_DAILY || "0 6 * * *";

async function schedulerDailyPlugin(fastify: FastifyInstance): Promise<void> {
  // node-cron handles DST automatically when timezone is set.
  const task = cron.schedule(
    CRON_SCHEDULE_DAILY,
    async () => {
      try {
        logger.info("scheduler: running daily scans");

        // Run in this order, sequentially: their WHERE clauses can both
        // match the same onetimer opportunity in the same tick (e.g. one
        // stuck in SEARCHING past its date with a MATCHED volunteer), and
        // running them concurrently let whichever transaction committed
        // last silently win, leaving an unpredictable ACTIVE/PAST state
        // (be#987 review).
        await runWithAdvisoryLock(
          () =>
            runNamedCronJobs(
              [
                {
                  name: "activateDueOnetimers",
                  run: () => activateDueOnetimers(fastify),
                },
                {
                  name: "scanExpiredOnetimers",
                  run: () => scanExpiredOnetimers(fastify),
                },
                // The cron jobs' emails, posted to Slack #cron-notifications
                // (be#1088), after the status jobs above. Each scan takes
                // only what crossed its threshold since yesterday's run, so
                // every row is posted once.
                {
                  name: "scanStalePending",
                  run: () => scanStalePending(fastify),
                },
                {
                  name: "scanPostMatchCheckup",
                  run: () => scanPostMatchCheckup(fastify),
                },
                {
                  name: "scanRegularUpdate",
                  run: () => scanRegularUpdate(fastify),
                },
                // Its target is today + 4 working days: on a weekend or a
                // holiday that is the day the previous working day already
                // took.
                ...(isWorkingDay(berlinToday())
                  ? [
                      {
                        name: "scanAccompanyNotFound",
                        run: () => scanAccompanyNotFound(fastify),
                      },
                    ]
                  : []),
              ],
              { sequential: true },
            ),
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

export default fp(schedulerDailyPlugin, {
  name: "scheduler-daily",
  dependencies: ["typeorm-plugin", "notify"],
});
