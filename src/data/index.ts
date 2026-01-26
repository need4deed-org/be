import { dataSource } from "./data-source";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

const lockNumber = 0xcdf2a8471b3e8f5fn;

async function initDatabase() {
  await dataSource.query(`SELECT pg_advisory_lock(${lockNumber})`);
  try {
    await dataSource.initialize();
    if (dataSource.isInitialized) {
      dataSource.logger.log("info", "Data Source has been initialized!");

      await dataSource.runMigrations();
      dataSource.logger.log("info", "Run migrations");

      await createVolunteerListMV(dataSource);
      dataSource.logger.log("info", "Created MVs");

      dataSource.logger.log("info", "Seeded master data");
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw Error(
      `Error occurred while initializing DataSource: ${error.message}`,
    );
  } finally {
    await dataSource.query(`SELECT pg_advisory_unlock(${lockNumber})`);
  }
}

if (dataSource.isInitialized === false) {
  initDatabase();
}
