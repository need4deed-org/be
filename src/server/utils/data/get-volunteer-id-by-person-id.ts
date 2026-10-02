import { dataSource } from "../../../data/data-source";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

export async function getVolunteerIdByPersonId(
  personId: number,
): Promise<number | undefined> {
  const volunteerRepository = getRepository(dataSource, Volunteer);
  const volunteer = await volunteerRepository.findOne({
    where: { personId },
    select: { id: true },
  });
  return volunteer?.id;
}
