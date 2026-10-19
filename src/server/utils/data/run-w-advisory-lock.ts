import { dataSource } from "../../../data/data-source";
import logger from "../../../logger";

export async function runWithAdvisoryLock(
  fn: () => Promise<void>,
  lockId: number | [number, number],
): Promise<boolean> {
  const qr = dataSource.createQueryRunner();
  try {
    await qr.connect();
    await qr.startTransaction();
    const [row] = Array.isArray(lockId)
      ? await qr.query(
          "SELECT pg_try_advisory_xact_lock($1, $2) AS acquired",
          lockId,
        )
      : await qr.query("SELECT pg_try_advisory_xact_lock($1) AS acquired", [
          lockId,
        ]);
    if (!row?.acquired) {
      logger.debug(
        "scheduler: advisory lock held by another instance — skipping",
      );
      await qr.rollbackTransaction();
      return false;
    }
    await fn();
    await qr.commitTransaction();
    return true;
  } catch (err) {
    await qr.rollbackTransaction().catch(logger.error);
    throw err;
  } finally {
    await qr.release();
  }
}
