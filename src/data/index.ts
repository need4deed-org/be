import { dataSource } from "./data-source";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

const lockNumber = 0x639b4e2a1c8d79a9n; // random BIGINT (for PostgreSQL)

async function initDatabase() {
  await dataSource.initialize();
  if (dataSource.isInitialized) {
    dataSource.logger.log("info", "Data Source has been initialized!");
    await dataSource.query(`SELECT pg_advisory_lock(${lockNumber})`);
    dataSource.logger.log("info", "Acquired the lock for migrations");
    try {
      if (process.env.NODE_ENV !== "development") {
        await dataSource.runMigrations();
        dataSource.logger.log("info", "Run migrations");
      }

      await createVolunteerListMV(dataSource);
      dataSource.logger.log("info", "Created MVs");

      dataSource.logger.log("info", "Seeded master data");
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
