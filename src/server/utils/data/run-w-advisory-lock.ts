import { dataSource } from "../../../data/data-source";
import logger from "../../../logger";

export async function runWithAdvisoryLock(
  fn: () => Promise<void>,
  lockId: number,
): Promise<void> {
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
