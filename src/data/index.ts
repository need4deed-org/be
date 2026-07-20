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

const GENESIS_NAME = "GenesisBaseSchema1763036250000";
// Postgres error codes genesis's own DDL guards can fail to catch when its
// objects already exist: duplicate_object, duplicate_table, and
// invalid_table_definition (the "table already has a primary key" case).
// See genesis-base-schema.ts's own comment on the PK guard for the same class
// of gotcha — the UNIQUE constraint block never got the equivalent guard.
const ALREADY_EXISTS_CODES = new Set(["42710", "42P07", "42P16"]);

// On a fresh database the migrations table is empty, so TypeORM would try to
// run all 74 migrations in sequence — but migrations 1-73 conflict with the
// schema that genesis already created (duplicate enums/tables).
// This function runs genesis directly and marks all 74 migrations as done
// BEFORE TypeORM reads the migrations table, so TypeORM sees 0 pending and
// skips everything.
//
// The same gap also shows up on databases bootstrapped from a raw schema
// dump/snapshot: migrations 2-N get recorded (by whatever seeded the dump)
// but genesis's own row never does, since that bookkeeping is normally
// TypeORM's job after genesis.up() returns. Replaying genesis.up() against a
// dump that already has its objects hits exactly the guard gaps above. If
// genesis.up() fails with one of those specific "already exists" codes, we
// treat that as proof the schema is already there and just backfill genesis's
// own tracking row instead of re-attempting its DDL — this is the same fix
// applied manually to the pre/production incidents this covers.
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
