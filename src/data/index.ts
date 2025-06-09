import { AppDataSource } from "./data-source";

AppDataSource.initialize()
  .then(async () => {
    console.log("Loading from the database...");
  })
  .catch((error) => console.log(error));
