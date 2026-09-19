import { FindOptionsWhere, Not } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

export interface VolunteerCloneLookup {
  id: number;
  email?: string | null;
  phone?: string | null;
}

export async function getVolunteerClones({
  id,
  email,
  phone,
}: VolunteerCloneLookup): Promise<number[]> {
  const volunteerRepository = getRepository(dataSource, Volunteer);
  const personConditions: FindOptionsWhere<Person>[] = [];

  if (email) {
    personConditions.push({ email });
  }

  if (phone) {
    personConditions.push({ phone });
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
