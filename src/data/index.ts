import {
  isProd,
  shouldRunMigrations,
  shouldTruncateAll,
} from "../config/constants";
import logger from "../logger";
import { tryCatch } from "../services/utils";
import { dataSource } from "./data-source";
import { seed } from "./seeds/seed";
import { removeData } from "./utils";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

const lockNumber = 0x639b4e2a1c8d79a9n; // random BIGINT (for PostgreSQL)

async function initDatabase() {
  await dataSource.initialize();
  if (dataSource.isInitialized) {
    logger.info("Data Source has been initialized!");
    await dataSource.query(`SELECT pg_advisory_lock(${lockNumber})`);
    logger.info("Acquired the lock for migrations");
    try {
      const [[migrationsTable]] = await tryCatch<[{ exists: boolean }]>(
        dataSource.query(
          `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'be_migrations') AS exists;`,
        ),
      );
      if (isProd || !migrationsTable?.exists || shouldRunMigrations) {
        logger.info("Attempting to run migrations");
        await dataSource.runMigrations();
        logger.info("Migrations completed");
      }

      if (shouldTruncateAll) {
        await removeData(dataSource);
      } else {
        logger.info("Truncate all tables skipped due to configuration");
      }

      logger.info("Attempting to seed data");
      await seed(dataSource);
      logger.info("Successfully seeded data");

      await createVolunteerListMV(dataSource);
      logger.info("Created MVs");

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

if (dataSource.isInitialized === false) {
  initDatabase();
}
