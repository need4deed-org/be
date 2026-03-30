import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { resolveVolunteerMatchStatus } from "../lib";
import { getRepository } from "./get-repository";

export async function updateVolunteerMatching(id: number): Promise<void> {
  const volunteerRepository = getRepository(dataSource, Volunteer);
  const volunteer = await volunteerRepository.findOneBy({ id });
  if (!volunteer) {
    return dataSource.logger.log(
      "warn",
      `This shouldn't've happened but volunteer id:${id} not found.`,
    );
  }

  const opportunityVolunteerRepository = getRepository(
    dataSource,
    OpportunityVolunteer,
  );
  const opportunitiesLinked = await opportunityVolunteerRepository.find({
    where: { volunteerId: id },
  });

  const statusMatch = resolveVolunteerMatchStatus(
    volunteer.statusMatch,
    opportunitiesLinked.map(({ status }) => status),
  );

  if (statusMatch !== volunteer.statusMatch) {
    const [, error] = await tryCatch(
      volunteerRepository.save(Object.assign(volunteer, { statusMatch })),
    );

    if (!volunteer) {
      dataSource.logger.log(
        "warn",
        `During saving volunteer (id:${id}) occurred: ${error}`,
      );
    }
  }
}
