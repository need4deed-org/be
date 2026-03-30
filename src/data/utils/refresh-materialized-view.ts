import { DataSource } from "typeorm";
import logger from "../../logger";
import { tryCatch } from "../../services/utils";

export async function refreshMaterializedView(
  dataSource: DataSource,
  viewName: string,
): Promise<void> {
  const [, error] = await tryCatch(
    await dataSource.query(`REFRESH MATERIALIZED VIEW ${viewName}`),
  );

  if (error) {
    logger.error(
      `Error refreshing materialized view '${viewName}': ${error.message}`,
    );
    throw error;
  }
  logger.info(`Materialized view '${viewName}' refreshed successfully.`);
}
