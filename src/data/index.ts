import { isProd, shouldRunMigrations } from "../config";
import logger from "../logger";
import { dataSource } from "./data-source";
import { GenesisBaseSchema1763036250000 } from "./migrations/1763036250000-genesis-base-schema";

const lockNumber = 0x639b4e2a1c8d79a9n;

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

const GENESIS_NAME = "GenesisBaseSchema1763036250000";

const ALREADY_EXISTS_CODES = new Set(["42710", "42P07", "42P16"]);

export async function bootstrapFreshDb(): Promise<void> {
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
    const [{ tracked }] = await qr.query(
      `SELECT EXISTS (SELECT 1 FROM public.be_migrations WHERE name = $1) AS tracked`,
      [GENESIS_NAME],
    );
    if (tracked) {
      return;
    }

    logger.info("Genesis migration untracked — running genesis bootstrap");
    await qr.startTransaction();
    try {
      const genesis = new GenesisBaseSchema1763036250000();
      await genesis.up(qr);
      await qr.query(
        `INSERT INTO public.be_migrations (timestamp, name) VALUES (1763036250000, $1)`,
        [GENESIS_NAME],
      );
      await qr.commitTransaction();
      logger.info("Genesis bootstrap completed — all migrations pre-marked");
    } catch (e) {
      await qr.rollbackTransaction();
      if (!ALREADY_EXISTS_CODES.has(e.code)) {
        throw e;
      }

      logger.info(
        "Genesis DDL hit pre-existing objects (dump-bootstrapped schema) — backfilling genesis tracking row only",
      );
      await qr.query(
        `INSERT INTO public.be_migrations (timestamp, name) VALUES (1763036250000, $1)`,
        [GENESIS_NAME],
      );
      logger.info("Genesis tracking row backfilled");
    }
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
