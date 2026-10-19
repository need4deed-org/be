import { EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import logger from "../../../logger";

export async function runWithAdvisoryLock(
  fn: (manager: EntityManager) => Promise<void>,
  lockId: number | [namespace: string, id: number],
): Promise<boolean> {
  const qr = dataSource.createQueryRunner();
  try {
    await qr.connect();
    await qr.startTransaction();
    const [row] = Array.isArray(lockId)
      ? await qr.query(
          "SELECT pg_try_advisory_xact_lock(hashtext($1), $2) AS acquired",
          lockId,
        )
      : await qr.query("SELECT pg_try_advisory_xact_lock($1) AS acquired", [
          lockId,
        ]);
    if (!row?.acquired) {
      logger.debug(
        `advisory lock ${[lockId].flat().join(":")} is held — skipping`,
      );
      await qr.rollbackTransaction();
      return false;
    }
    await fn(qr.manager);
    await qr.commitTransaction();
    return true;
  } catch (err) {
    await qr
      .rollbackTransaction()
      .catch((rollbackErr) => logger.error(rollbackErr));
    throw err;
  } finally {
    await qr.release();
  }
}
