import { EntityManager } from "typeorm";
import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { resolveVolunteerMatchStatus } from "../lib";
import { getRepository } from "./get-repository";

// Pass the caller's EntityManager when running inside a transaction (e.g.
// from OpportunityVolunteerSubscriber), so the recompute sees the uncommitted
// link rows; otherwise it reads committed data via the global dataSource.
export async function updateVolunteerMatching(
  id: number,
  manager: EntityManager = dataSource.manager,
): Promise<void> {
  const volunteerRepository = getRepository(manager, Volunteer);
  const volunteer = await volunteerRepository.findOneBy({ id });
  if (!volunteer) {
    return dataSource.logger.log(
      "warn",
      `This shouldn't've happened but volunteer id:${id} not found.`,
    );
  }

  const opportunityVolunteerRepository = getRepository(
    manager,
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

    if (error) {
      dataSource.logger.log(
        "warn",
        `During saving volunteer (id:${id}) occurred: ${error}`,
      );
    }
  }
}
