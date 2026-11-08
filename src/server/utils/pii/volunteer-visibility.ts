import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { getSharingPeerAgentIds } from "../data/live-sharing-agents";
import { resolveCallerMask } from "./pre-serialization";
import { CallerVisibility } from "./visible-persons";

type VolunteerOwnership = {
  ownerAgentId: number | null;
  personId: number | null;
};

const withSharingOwners = new WeakSet<CallerVisibility>();

export async function resolveVolunteerVisibility(
  request: FastifyRequest,
): Promise<CallerVisibility | null> {
  const visibility = await resolveCallerMask(request);
  if (
    !visibility ||
    visibility.role !== UserRole.AGENT ||
    visibility.agentIds.size === 0 ||
    withSharingOwners.has(visibility)
  ) {
    return visibility;
  }
  withSharingOwners.add(visibility);
  const sharing = await getSharingPeerAgentIds(request, [
    ...visibility.agentIds,
  ]);
  sharing.forEach((id) => visibility.ownerAgentIds.add(id));
  return visibility;
}

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
  const visibility = await resolveVolunteerVisibility(request);
  if (!visibility) {
    return;
  }
  const volunteer = await request.server.db.volunteerRepository.findOne({
    select: { id: true, ownerAgentId: true, personId: true },
    where: { id: volunteerId },
  });
  if (!volunteer || !isVolunteerVisible(volunteer, visibility)) {
    throw new NotFoundError(`Volunteer (id:${volunteerId}) not found.`);
  }
}
