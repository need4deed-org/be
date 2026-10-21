import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { berlinToday, isWorkingDay } from "need4deed-sdk";
import cron from "node-cron";
import { berlinTimeZone } from "../../config";
import logger from "../../logger";
import { activateDueOnetimers } from "../../services/jobs/activate-due-onetimers";
import { pruneRefreshSessions } from "../../services/jobs/prune-refresh-sessions";
import { scanAccompanyNotFound } from "../../services/jobs/scan-accompany-not-found";
import { scanExpiredOnetimers } from "../../services/jobs/scan-expired-onetimers";
import { scanPostMatchCheckup } from "../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../services/jobs/scan-stale-pending";
import { runNamedCronJobs, runWithAdvisoryLock } from "../utils";

const SCHEDULER_LOCK_ID = 20240707;
const ACCOMPANY_NOT_FOUND_LOCK_ID = 20261020;

const CRON_SCHEDULE_DAILY = process.env.CRON_SCHEDULE_DAILY || "0 6 * * *";
const CRON_SCHEDULE_ACCOMPANY_NOT_FOUND =
  process.env.CRON_SCHEDULE_ACCOMPANY_NOT_FOUND || "0 10 * * *";

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
                {
                  name: "pruneRefreshSessions",
                  run: () => pruneRefreshSessions(fastify),
                },
              ],
              { sequential: true },
            ),
          SCHEDULER_LOCK_ID,
        );
      } catch (err) {
        logger.error(
          { err },
          "scheduler: unhandled error in daily cron callback",
        );
      }
    },
    { timezone: berlinTimeZone },
  );

  if (!cron.validate(CRON_SCHEDULE_ACCOMPANY_NOT_FOUND)) {
    logger.error(
      { schedule: CRON_SCHEDULE_ACCOMPANY_NOT_FOUND },
      "scheduler: CRON_SCHEDULE_ACCOMPANY_NOT_FOUND is not a valid cron expression — accompany-not-found scan not scheduled",
    );
    fastify.addHook("onClose", () => task.stop());
    return;
  }

  const accompanyNotFoundTask = cron.schedule(
    CRON_SCHEDULE_ACCOMPANY_NOT_FOUND,
    async () => {
      try {
        if (!isWorkingDay(berlinToday())) {
          return;
        }
        await runWithAdvisoryLock(
          () =>
            runNamedCronJobs([
              {
                name: "scanAccompanyNotFound",
                run: () => scanAccompanyNotFound(fastify),
              },
            ]),
          ACCOMPANY_NOT_FOUND_LOCK_ID,
        );
      } catch (err) {
        logger.error(
          { err },
          "scheduler: unhandled error in accompany-not-found cron callback",
        );
      }
    },
    { timezone: berlinTimeZone },
  );

  fastify.addHook("onClose", () => {
    task.stop();
    accompanyNotFoundTask.stop();
  });
}

export default fp(schedulerDailyPlugin, {
  name: "scheduler-daily",
  dependencies: ["typeorm-plugin", "notify"],
});
