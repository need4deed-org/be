import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import { dataSource } from "../../data/data-source";
import logger from "../../logger";
import {
  berlinToday,
  isGermanPublicHoliday,
} from "../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../services/jobs/scan-accompany-not-found";
import { scanPostMatchCheckup } from "../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../services/jobs/scan-stale-pending";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240701;

async function runWithAdvisoryLock(fn: () => Promise<void>): Promise<void> {
  const [row] = await dataSource.query(
    "SELECT pg_try_advisory_lock($1) AS acquired",
    [SCHEDULER_LOCK_ID],
  );
  if (!row?.acquired) {
    logger.debug(
      "scheduler: advisory lock held by another instance — skipping",
    );
    return;
  }
  try {
    await fn();
  } finally {
    await dataSource.query("SELECT pg_advisory_unlock($1)", [
      SCHEDULER_LOCK_ID,
    ]);
  }
}

async function schedulerPlugin(fastify: FastifyInstance): Promise<void> {
  // Hourly on the hour, 08:00–19:00 Berlin time, weekdays only.
  // node-cron handles DST automatically when timezone is set.
  cron.schedule(
    "0 8-19 * * 1-5",
    async () => {
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
            logger.error(`scheduler: scan failed: ${r.reason}`);
          }
        }
      });
    },
    { timezone: "Europe/Berlin" },
  );
}

export default fp(schedulerPlugin, {
  name: "scheduler",
  dependencies: ["typeorm-plugin", "notify"],
});
