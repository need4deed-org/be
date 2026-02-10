import { DataSource } from "typeorm";
import Config from "../entity/config.entity";
import { ConfigType } from "../types";
import { getRepository } from "../utils";

export async function removeData(dataSource: DataSource): Promise<void> {
  const configRepository = getRepository(dataSource, "config");
  let flagRecord = (await configRepository.findOneBy({
    configKey: ConfigType.TRUNCATE_ALL,
  })) as Config | null;

  if (flagRecord && flagRecord.configValue === true) {
    dataSource.logger.log(
      "info",
      "Data is already truncated according to the config. Skipping truncation.",
    );
  }

  dataSource.logger.log(
    "info",
    "Attempting to remove existing data from the database...",
  );
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
  await configRepository.save(flagRecord);

  dataSource.logger.log("info", "Existing data has been removed successfully");
}
