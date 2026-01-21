import { dataSource } from "./data-source";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

let queryRunner: import("typeorm").QueryRunner;
async function initDatabase() {
  try {
    await dataSource.initialize();
    if (dataSource.isInitialized) {
      // eslint-disable-next-line no-console
      console.log("Data Source has been initialized!");

      // Run pending migrations in development
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("Running pending migrations...");
        await dataSource.runMigrations();
        // eslint-disable-next-line no-console
        console.log("Migrations completed.");
      }
      queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await createVolunteerListMV(queryRunner);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw Error(
      `Error occurred while initializing DataSource: ${error.message}`,
    );
  } finally {
    if (queryRunner) {
      await queryRunner.release();
    }
  }
}

if (dataSource.isInitialized === false) {
  initDatabase();
}
