import { DataSource } from "typeorm";

export async function removeData(dataSource: DataSource): Promise<void> {
  dataSource.logger.log("info", "Removing existing data from the database");

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
            AND tablename NOT IN ('be_migrations', 'typeorm_metadata')
        ) LOOP
            EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
        END LOOP; -- Corrected from END DECLARE
    END $$;
  `);

  dataSource.logger.log("info", "Existing data has been removed successfully");
}
