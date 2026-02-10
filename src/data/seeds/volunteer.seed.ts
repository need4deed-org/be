import { DataSource } from "typeorm";
import { seedVolunteersFile } from "../../config/constants";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { getRepository, readJsonAsync } from "../utils";
import { VolunteerJSON } from "./types";
import {
  createDeal,
  getCount,
  getDocumentStatus,
  getOrCreatePerson,
  getVolunteerState,
} from "./utils";

export async function seedVolunteers(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const volunteerRepository = getRepository(dataSource, Volunteer);

  const count = await getCount(volunteerRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding volunteers.");
    return;
  }

  const volunteers = (await readJsonAsync(
    seedVolunteersFile,
  )) as VolunteerJSON[];

  volunteers.forEach(async (volunteer) => {
    try {
      const person = await getOrCreatePerson(volunteer.person, dataSource);

      const deal = await createDeal(volunteer.deal, dataSource);

      const newVolunteer = new Volunteer({
        ...getVolunteerState(volunteer),
        statusCGC: getDocumentStatus(volunteer.statusCGC),
        statusVaccination: getDocumentStatus(volunteer.statusVaccination),
        infoAbout: volunteer.infoAbout || "",
        infoExperience: volunteer.infoExperience || "",
        person,
        deal,
      });
      await volunteerRepository.save(newVolunteer);
    } catch (error) {
      dataSource.logger.log(
        "log",
        `Creation of volunteer ${volunteer?.person?.email} rolled back due to error: ${error.message}`,
      );
    }
  });
}
