import { AppDataSource } from "./data-source";

async function initDatabase() {
  try {
    const dataSource = await AppDataSource.initialize();
    if (dataSource.isInitialized) {
      // eslint-disable-next-line no-console
      console.log("Data Source has been initialized!");
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw Error(
      `Error occurred while initializing DataSource: ${error.message}`,
    );
  }
}

initDatabase();
