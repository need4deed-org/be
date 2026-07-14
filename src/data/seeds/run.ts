import { initDatabase } from "..";
import { dataSource } from "../data-source";
import { seed } from "./seed";

initDatabase()
  .then(() => seed(dataSource))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
