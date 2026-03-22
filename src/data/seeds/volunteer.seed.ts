import { EntityTableName, OpportunityVolunteerStatusType } from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedVolunteersFile } from "../../config/constants";
import logger from "../../logger";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import NotionRelation from "../entity/notion-relation.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { VolunteerJSON } from "./types";
import {
  createDeal,
  getCount,
  getDocumentStatus,
  getEnumValue,
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
    logger.info("Skipping seeding volunteers.");
    return;
  }

  const volunteers = (await fetchJsonFromUrl(
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

      const notionRelationRepository = getRepository(
        dataSource,
        NotionRelation,
      );
      const relationsOpp = await notionRelationRepository.find({
        where: {
          hostType: EntityTableName.OPPORTUNITY,
          tenantType: EntityTableName.VOLUNTEER,
          tenantNid: volunteer.nid,
        },
      });

      const opportunityVolunteerRepository = getRepository(
        dataSource,
        OpportunityVolunteer,
      );
      relationsOpp.forEach(async ({ payroll, hostId }) => {
        await opportunityVolunteerRepository.save(
          new OpportunityVolunteer({
            status: getEnumValue(OpportunityVolunteerStatusType, payroll),
            opportunityId: hostId,
            volunteerId: newVolunteer.id,
          }),
        );
      });
    } catch (error) {
      logger.info(
        `Creation of volunteer ${volunteer?.person?.email} rolled back due to error: ${error.message}`,
      );
    }
  });
}
