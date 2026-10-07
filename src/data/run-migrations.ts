import "reflect-metadata";
import { bootstrapFreshDb } from ".";
import logger from "../logger";
import { dataSource } from "./data-source";

async function main() {
  await dataSource.initialize();
  try {
    await bootstrapFreshDb();
    const executed = await dataSource.runMigrations();
    if (executed.length === 0) {
      logger.info("No migrations are pending");
    } else {
      for (const migration of executed) {
        logger.info(
          `Migration ${migration.name} has been executed successfully.`,
        );
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
