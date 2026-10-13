import { FastifyRequest } from "fastify";
import { NotFoundError } from "../../../config";
import { resolveCallerMask } from "./pre-serialization";
import { CallerVisibility } from "./visible-persons";

type VolunteerOwnership = {
  ownerAgentId: number | null;
  personId: number | null;
};

export function isVolunteerVisible(
  volunteer: VolunteerOwnership,
  visibility: CallerVisibility | null,
): boolean {
  if (!visibility || volunteer.ownerAgentId === null) {
    return true;
  }
  return (
    visibility.ownerAgentIds.has(volunteer.ownerAgentId) ||
    (volunteer.personId !== null &&
      visibility.personIds.has(volunteer.personId))
  );
}

export async function assertVolunteerVisible(
  request: FastifyRequest,
  volunteerId: number,
): Promise<void> {
  const visibility = await resolveCallerMask(request);
  if (!visibility) {
    return;
  }
  const volunteer = await request.server.db.volunteerRepository.findOne({
    select: { id: true, ownerAgentId: true, personId: true },
    where: { id: volunteerId },
  });
  if (volunteer && !isVolunteerVisible(volunteer, visibility)) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
}

export function hideUnsharedOwner<T extends { ownerAgentId: number | null }>(
  volunteer: T,
  visibility: CallerVisibility | null,
): T {
  if (
    visibility &&
    volunteer.ownerAgentId !== null &&
    !visibility.ownerAgentIds.has(volunteer.ownerAgentId)
  ) {
    return { ...volunteer, ownerAgentId: null };
  }
  return volunteer;
}
