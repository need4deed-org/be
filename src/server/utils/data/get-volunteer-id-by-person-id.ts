import { dataSource } from "../../../data/data-source";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getRepository } from "../../../data/utils";

// Shared by GET /me (be#948) and POST /user/verify-email (be#943) — a single
// place for "does this person have a Volunteer profile", so a future change
// to that lookup's semantics can't land in one call site and not the other.
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
