import { AppDataSource } from "./data-source";
import { createVolunteerListMV } from "./lib";
import { seed } from "./seeds/seed";

async function initializeDataSource() {
  if (!AppDataSource.isInitialized) {
    try {
      const dataSource = await AppDataSource.initialize();
      await dataSource.runMigrations();
      await seed(dataSource);
      await createVolunteerListMV(dataSource);
    } catch (error) {
      console.log(error);
      throw Error(
        `Error occurred while initializing DataSource: ${error.message}`,
      );
    }
  }
}

initializeDataSource();
