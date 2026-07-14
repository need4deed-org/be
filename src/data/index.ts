import { isProd, shouldRunMigrations } from "../config";
import logger from "../logger";
import { dataSource } from "./data-source";
import { GenesisBaseSchema1763036250000 } from "./migrations/1763036250000-genesis-base-schema";

const lockNumber = 0x639b4e2a1c8d79a9n; // random BIGINT (for PostgreSQL)

export const check = {
  calls: 0,
  count: 0,
  flag: false,
  nid: "",
  log(msg: string) {
    if (this.flag) {
      logger.debug(msg);
    }
  },
};

// On a fresh database the migrations table is empty, so TypeORM would try to
// run all 74 migrations in sequence — but migrations 1-73 conflict with the
// schema that genesis already created (duplicate enums/tables).
// This function runs genesis directly and marks all 74 migrations as done
// BEFORE TypeORM reads the migrations table, so TypeORM sees 0 pending and
// skips everything. On an existing database (cnt > 0) it is a no-op.
async function bootstrapFreshDb(): Promise<void> {
  const qr = dataSource.createQueryRunner();
  try {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS public.be_migrations (
        id   SERIAL         NOT NULL,
        "timestamp" bigint  NOT NULL,
        name character varying NOT NULL,
        PRIMARY KEY (id)
      )
    `);
    const [{ cnt }] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM public.be_migrations`,
    );
    if (cnt > 0) {return;}

    logger.info("Fresh database detected — running genesis bootstrap");
    await qr.startTransaction();
    try {
      const genesis = new GenesisBaseSchema1763036250000();
      await genesis.up(qr);
      await qr.query(
        `INSERT INTO public.be_migrations (timestamp, name)
         VALUES (1763036250000, 'GenesisBaseSchema1763036250000')`,
      );
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    }
    logger.info("Genesis bootstrap completed — all migrations pre-marked");
  } finally {
    await qr.release();
  }
}

export async function initDatabase() {
  await dataSource.initialize();
  if (dataSource.isInitialized) {
    logger.info("Data Source has been initialized!");
    await dataSource.query(`SELECT pg_advisory_lock(${lockNumber})`);
    logger.info("Acquired the lock for migrations");
    try {
      if (isProd || shouldRunMigrations) {
        logger.info("Attempting to run migrations");
        await bootstrapFreshDb();
        await dataSource.runMigrations();
        logger.info("Migrations completed");
      }

      logger.info("Database initialization completed");
    } catch (error) {
      logger.error(error);
      throw Error(
        `Error occurred while initializing DataSource: ${error.message}`,
      );
    } finally {
      await dataSource.query(`SELECT pg_advisory_unlock(${lockNumber})`);
      logger.info("Released the lock for migrations");
    }
  }
}
