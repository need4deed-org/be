import { AppDataSource } from "./data-source";
import { seed } from "./seeds/seed";

AppDataSource.initialize()
  .then(() => {
    seed();
  })
  .catch((error) => {
    console.log(error);
    throw Error(
      `Error occurred while initializing DataSource: ${error.message}`,
    );
  });
