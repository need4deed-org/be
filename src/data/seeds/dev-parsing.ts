import { DataSource } from "typeorm";
import { seedVolunteersFile } from "../../config";
import { fetchJsonFromUrl } from "../utils";
import { VolunteerJSON } from "./types";
import { createTime } from "./utils";

export async function devTime(dataSource: DataSource) {
  const volunteersJson = (await fetchJsonFromUrl(
    seedVolunteersFile,
  )) as VolunteerJSON[];

  for (const volunteerJson of volunteersJson) {
    if (volunteerJson.nid === "VOLVO-525") {
      await createTime(dataSource, volunteerJson.deal.time);
    }
  }
}
