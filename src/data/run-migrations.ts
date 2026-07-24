import "reflect-metadata";
import { bootstrapFreshDb } from ".";
import logger from "../logger";
import { dataSource } from "./data-source";

// The plain TypeORM CLI (`typeorm migration:run`) reads the list of pending
// migrations before genesis's self-registration commits, so on a fresh
// database it still tries to replay migrations genesis already superseded.
// bootstrapFreshDb() (used by the real app startup path) closes that gap by
// running first and committing genesis's tracking row before TypeORM looks.
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
