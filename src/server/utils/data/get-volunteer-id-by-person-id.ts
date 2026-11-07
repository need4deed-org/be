import { EntityManager } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

export async function getVolunteerIdByPersonId(
  personId: number,
  manager: EntityManager = dataSource.manager,
): Promise<number | undefined> {
  const volunteerRepository = getRepository(manager, Volunteer);
  const volunteer = await volunteerRepository.findOne({
    where: { personId },
    select: { id: true },
  });
  return volunteer?.id;
}
