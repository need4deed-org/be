import { promises as fsAsync } from "fs";
import { join } from "path";
import { DataSource } from "typeorm";

const sqlFileNameMv = "volunteer_list_mv.sql";
const sqlFileNameExists = "volunteer_list_mv_exists.sql";

export async function createVolunteerListMV(dataSource: DataSource) {
  const sqlVolunteerListMvExists = String(
    await fsAsync.readFile(join(__dirname, "..", "sql", sqlFileNameExists)),
  );
  const viewExistsQuery = await dataSource.query(sqlVolunteerListMvExists);

  if (viewExistsQuery.length === 0) {
    const sqlVolunteerListMV = String(
      await fsAsync.readFile(join(__dirname, "..", "sql", sqlFileNameMv)),
    );

    await dataSource.query(sqlVolunteerListMV);
    dataSource.logger.log("info", "Volunteer list materialized view created.");
  } else {
    dataSource.logger.log(
      "info",
      "Volunteer list materialized already exists.",
    );
  }

  return dataSource;
}
