import { FindOptionsWhere, Not } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

export async function getVolunteerClones(id: number): Promise<number[]> {
  const volunteerRepository = getRepository(dataSource, Volunteer);

  const volunteer = await volunteerRepository.findOne({
    where: { id },
    relations: ["person"],
  });
  const personConditions: FindOptionsWhere<Person>[] = [];

  if (volunteer?.person?.email) {
    personConditions.push({ email: volunteer.person.email });
  }

  if (volunteer?.person?.phone) {
    personConditions.push({ phone: volunteer.person.phone });
  }

  if (personConditions.length === 0) {
    return [];
  }

  const where: FindOptionsWhere<Volunteer> = {
    person: personConditions,
    id: Not(id),
  };

  const cloneIds = await volunteerRepository.find({
    where,
    select: ["id"],
  });

  return cloneIds.map((clone) => clone.id);
}
