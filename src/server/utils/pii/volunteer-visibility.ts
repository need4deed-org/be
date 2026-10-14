import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../../config";
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
  const sharing: { id: number }[] =
    await request.server.db.agentRepository.manager.query(
      `WITH live_sharing AS (
         SELECT a.id FROM agent a
          WHERE a.shares_volunteers
            AND a.engagement_status <> $2
            AND EXISTS (SELECT 1 FROM agent_person ap
                         WHERE ap.agent_id = a.id AND ap.status = $3))
       SELECT id FROM live_sharing
        WHERE EXISTS (SELECT 1 FROM live_sharing own WHERE own.id = ANY($1))`,
      [
        [...visibility.agentIds],
        AgentEngagementStatusType.INACTIVE,
        AgentMembershipStatus.ACTIVE,
      ],
    );
  sharing.forEach((a) => visibility.ownerAgentIds.add(Number(a.id)));
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
