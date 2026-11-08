import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { Raw } from "typeorm";
import { NotFoundError } from "../../../config";

type OwnedVolunteerScope = { volunteerId: number; ownerAgentId: number };

const scopes = new WeakMap<FastifyRequest, OwnedVolunteerScope | null>();

export async function resolveOwnedVolunteerScope(
  request: FastifyRequest,
): Promise<OwnedVolunteerScope | null> {
  if (scopes.has(request)) {
    return scopes.get(request) ?? null;
  }
  const { authUser } = request;
  let scope: OwnedVolunteerScope | null = null;
  if (authUser?.role === UserRole.VOLUNTEER && authUser.personId) {
    const volunteer = await request.server.db.volunteerRepository.findOne({
      select: { id: true, ownerAgentId: true },
      where: { personId: authUser.personId },
    });
    if (volunteer?.ownerAgentId) {
      scope = {
        volunteerId: volunteer.id,
        ownerAgentId: volunteer.ownerAgentId,
      };
    }
  }
  scopes.set(request, scope);
  return scope;
}

export function ownedVolunteerOpportunityIdWhere(scope: OwnedVolunteerScope) {
  return Raw(
    (alias) => `${alias} IN (
      SELECT o.id FROM opportunity o WHERE o.agent_id = :ownedScopeAgentId
      UNION
      SELECT ov.opportunity_id FROM opportunity_volunteer ov
       WHERE ov.volunteer_id = :ownedScopeVolunteerId)`,
    {
      ownedScopeAgentId: scope.ownerAgentId,
      ownedScopeVolunteerId: scope.volunteerId,
    },
  );
}

export async function assertOwnedVolunteerSeesOpportunity(
  request: FastifyRequest,
  opportunityId: number,
  opportunityAgentId: number | null | undefined,
): Promise<void> {
  const scope = await resolveOwnedVolunteerScope(request);
  if (!scope || opportunityAgentId === scope.ownerAgentId) {
    return;
  }
  const suggested =
    await request.server.db.opportunityVolunteerRepository.existsBy({
      opportunityId,
      volunteerId: scope.volunteerId,
    });
  if (!suggested) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
}
