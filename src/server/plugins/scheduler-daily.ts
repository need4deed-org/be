import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cron from "node-cron";
import { dataSource } from "../../data/data-source";
import logger from "../../logger";
import { scanExpiredOnetimers } from "../../services/jobs/scan-expired-onetimers";

// Unique integer key for this app's advisory lock — prevents duplicate runs
// across multiple ECS instances.
const SCHEDULER_LOCK_ID = 20240701;

async function runWithAdvisoryLock(fn: () => Promise<void>): Promise<void> {
  // Use a transaction-level advisory lock (pg_try_advisory_xact_lock) so the
  // lock is released automatically at commit/rollback — no explicit unlock
  // needed. This avoids the session-level pitfall where pg_advisory_unlock
  // could fail and leave the connection holding the lock in the pool.
  const qr = dataSource.createQueryRunner();
  try {
    await qr.connect();
    await qr.startTransaction();
    const [row] = await qr.query(
      "SELECT pg_try_advisory_xact_lock($1) AS acquired",
      [SCHEDULER_LOCK_ID],
    );
    if (!row?.acquired) {
      logger.debug(
        "scheduler: advisory lock held by another instance — skipping",
      );
      await qr.rollbackTransaction();
      return;
    }
    await fn();
    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction().catch(logger.error);
    throw err;
  } finally {
    await qr.release();
  }
}

async function schedulerPlugin(fastify: FastifyInstance): Promise<void> {
  // Hourly on the hour, 08:00–19:00 Berlin time, weekdays only.
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
        });
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
