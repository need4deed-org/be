import { AppDataSource } from "./data-source";

AppDataSource.initialize().catch((error) => {
  console.log(error);
  throw Error(error);
});
