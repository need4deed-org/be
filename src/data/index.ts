import {
  isProd,
  shouldRunMigrations,
  shouldTruncateAll,
} from "../config/constants";
import { dataSource } from "./data-source";
import { seed } from "./seeds/seed";
import { removeData } from "./utils";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

const lockNumber = 0x639b4e2a1c8d79a9n; // random BIGINT (for PostgreSQL)

async function initDatabase() {
  await dataSource.initialize();
  if (dataSource.isInitialized) {
    dataSource.logger.log("info", "Data Source has been initialized!");
    await dataSource.query(`SELECT pg_advisory_lock(${lockNumber})`);
    dataSource.logger.log("info", "Acquired the lock for migrations");
    try {
      if (shouldTruncateAll) {
        dataSource.logger.log("info", "Attempting to truncate all tables...");
        await removeData(dataSource);
        dataSource.logger.log("info", "Successfully truncated all tables");
      } else {
        dataSource.logger.log(
          "info",
          "Truncate all tables skipped due to configuration",
        );
      }

      if (isProd || shouldRunMigrations) {
        dataSource.logger.log("info", "Attempting to run migrations");
        await dataSource.runMigrations();
        dataSource.logger.log("info", "Migrations completed");
      }

      await createVolunteerListMV(dataSource);
      dataSource.logger.log("info", "Created MVs");

      dataSource.logger.log("info", "Attempting to seed master data");
      await seed(dataSource);
      dataSource.logger.log("info", "Successfully seeded master data");
      dataSource.logger.log("info", "Database initialization completed");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      throw Error(
        `Error occurred while initializing DataSource: ${error.message}`,
      );
    } finally {
      await dataSource.query(`SELECT pg_advisory_unlock(${lockNumber})`);
      dataSource.logger.log("info", "Released the lock for migrations");
    }
  }
}

if (dataSource.isInitialized === false) {
  initDatabase();
}
