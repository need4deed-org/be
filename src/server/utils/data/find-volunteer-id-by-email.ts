import { ILike, Repository } from "typeorm";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { escapeLikePattern } from "./person-name-ilike";

export async function findVolunteerIdByEmail(
  volunteerRepository: Repository<Volunteer>,
  email: string,
): Promise<number | null> {
  const volunteer = await volunteerRepository.findOne({
    select: { id: true },
    where: { person: { email: ILike(escapeLikePattern(email.trim())) } },
    order: { id: "ASC" },
  });
  return volunteer?.id ?? null;
}
