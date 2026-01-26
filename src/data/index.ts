import { dataSource } from "./data-source";
import { createVolunteerListMV } from "./view/volunteer-list-mv";

let queryRunner: import("typeorm").QueryRunner;
async function initDatabase() {
  try {
    await dataSource.initialize();
    if (dataSource.isInitialized) {
      dataSource.logger.log("info", "Data Source has been initialized!");

      queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await createVolunteerListMV(queryRunner);
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
    if (queryRunner) {
      await queryRunner.release();
    }
  }
}

if (dataSource.isInitialized === false) {
  initDatabase();
}
