import { ILike } from "typeorm";
import { dataSource } from "../../../data/data-source";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { escapeLikePattern } from "./person-name-ilike";

export async function findVolunteerIdByEmail(
  email: string,
): Promise<number | null> {
  const volunteer = await dataSource.getRepository(Volunteer).findOne({
    select: { id: true },
    where: { person: { email: ILike(escapeLikePattern(email.trim())) } },
    order: { id: "ASC" },
  });
  return volunteer?.id ?? null;
}
