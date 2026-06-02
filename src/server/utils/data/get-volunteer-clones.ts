import { Not } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

export async function getVolunteerClones(id: number): Promise<number[]> {
  const volunteerRepository = getRepository(dataSource, Volunteer);

  const volunteer = await volunteerRepository.findOne({
    where: { id },
    relations: ["person"],
  });

  const cloneIds = await volunteerRepository.find({
    where: {
      person: [
        { email: volunteer?.person.email },
        { phone: volunteer?.person.phone },
      ],
      id: Not(id),
    },
    select: ["id"],
  });
  return cloneIds.map((clone) => clone.id);
}
