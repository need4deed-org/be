import { dataSource } from "../../../data/data-source";
import logger from "../../../logger";

export async function runWithAdvisoryLock(
  fn: () => Promise<void>,
  lockId: number,
): Promise<void> {
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
      [lockId],
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
