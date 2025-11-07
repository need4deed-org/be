import { AppDataSource } from "./data-source";
import { createVolunteerListMV } from "./lib";
import { seed } from "./seeds/seed";

AppDataSource.initialize()
  .catch((error) => {
    console.log(error);
    throw Error(
      `Error occurred while initializing DataSource: ${error.message}`,
    );
  });
