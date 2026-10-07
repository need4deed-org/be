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

const SCHEDULER_LOCK_ID = 20240707;

const CRON_SCHEDULE_DAILY = process.env.CRON_SCHEDULE_DAILY || "0 6 * * *";

async function schedulerDailyPlugin(fastify: FastifyInstance): Promise<void> {
  const task = cron.schedule(
    CRON_SCHEDULE_DAILY,
    async () => {
      try {
        logger.info("scheduler: running daily scans");

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
