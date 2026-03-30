import { DataSource } from "typeorm";
import logger from "../../logger";
import { tryCatch } from "../../services/utils";
import Config from "../entity/config.entity";
import { ConfigType } from "../types";
import { getRepository } from "../utils";

export async function removeData(dataSource: DataSource): Promise<void> {
  const configRepository = getRepository(dataSource, "config");
  let [flagRecord, error] = await tryCatch(
    configRepository.findOneBy({
      configKey: ConfigType.TRUNCATE_ALL,
    }) as Promise<Config | null>,
  );
  if (error) {
    logger.warn(`Fetching config for truncating all: ${error}`);
    return;
  }

  logger.info(
    `Checking if data truncation is needed based on config: ${flagRecord && flagRecord.configValue === true ? "Okay." : JSON.stringify(flagRecord)}`,
  );

  if (
    flagRecord &&
    flagRecord.configValue === true &&
    flagRecord?.configValue === true
  ) {
    logger.info(
      "Data is already truncated according to the config. Skipping truncation.",
    );
    return;
  }

  logger.info("Attempting to remove existing data from the database...");
  await dataSource.query(`
    DO $$ 
    DECLARE 
        r RECORD;
    BEGIN
        -- Filter out the migrations table to avoid breaking TypeORM's history
        FOR r IN (
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT IN ('be_migrations', 'typeorm_metadata', 'config') -- Exclude migrations and config tables
        ) LOOP
            EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
        END LOOP; -- Corrected from END DECLARE
    END $$;
  `);

  flagRecord = flagRecord || new Config({ configKey: ConfigType.TRUNCATE_ALL });
  flagRecord.configValue = true;
  [, error] = await tryCatch(configRepository.save(flagRecord));
  if (error) {
    logger.warn(`Writing config for truncating all: ${error}`);
  }

  logger.info("Existing data has been removed successfully");
}
