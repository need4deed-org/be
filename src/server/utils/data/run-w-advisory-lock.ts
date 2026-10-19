import { EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import logger from "../../../logger";

export async function runWithAdvisoryLock(
  fn: (manager: EntityManager) => Promise<void>,
  lockId: number | [number, number],
): Promise<boolean> {
  const key = Array.isArray(lockId) ? lockId : [lockId];
  const placeholders = key.map((_, i) => `$${i + 1}`).join(", ");
  const qr = dataSource.createQueryRunner();
  try {
    await qr.connect();
    const [row] = await qr.query(
      `SELECT pg_try_advisory_lock(${placeholders}) AS acquired`,
      key,
    );
    if (!row?.acquired) {
      logger.debug(`advisory lock ${key.join(":")} is held — skipping`);
      return false;
    }
    try {
      await fn(qr.manager);
    } finally {
      await qr
        .query(`SELECT pg_advisory_unlock(${placeholders})`, key)
        .catch((err) => logger.error(err));
    }
    return true;
  } finally {
    await qr.release();
  }
}
