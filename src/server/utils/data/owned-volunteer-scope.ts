import { FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { FindOptionsWhere, Raw } from "typeorm";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { andIntoWhere } from "./merge-into-where";
import { closedForVolunteersIdWhere } from "./no-match-found";

export type OwnedVolunteerScope = { volunteerId: number; ownerAgentId: number };

export async function resolveOwnedVolunteerScope(
  request: FastifyRequest,
): Promise<OwnedVolunteerScope | null> {
  if (request.ownedVolunteerScope !== undefined) {
    return request.ownedVolunteerScope;
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
  request.ownedVolunteerScope = scope;
  return scope;
}

function ownedVolunteerOpportunityIdWhere(scope: OwnedVolunteerScope) {
  return Raw(
    (alias) => `(${alias} IN (
      SELECT o.id FROM opportunity o WHERE o.agent_id = :ownedScopeAgentId)
      OR ${alias} IN (
      SELECT ov.opportunity_id FROM opportunity_volunteer ov
       WHERE ov.volunteer_id = :ownedScopeVolunteerId))`,
    {
      ownedScopeAgentId: scope.ownerAgentId,
      ownedScopeVolunteerId: scope.volunteerId,
    },
  );
}

export async function applyVolunteerOpportunityScope(
  request: FastifyRequest,
  where: FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[],
): Promise<void> {
  if (request.authUser?.role !== UserRole.VOLUNTEER) {
    return;
  }
  andIntoWhere(where, "id", closedForVolunteersIdWhere());
  const scope = await resolveOwnedVolunteerScope(request);
  if (scope) {
    andIntoWhere(where, "id", ownedVolunteerOpportunityIdWhere(scope));
  }
}

export async function assertOwnedVolunteerSeesOpportunity(
  request: FastifyRequest,
  opportunityId: number,
  opportunityAgentId: number | null | undefined,
  loadedMatches?: { volunteerId: number }[],
): Promise<void> {
  const scope = await resolveOwnedVolunteerScope(request);
  if (!scope || opportunityAgentId === scope.ownerAgentId) {
    return;
  }
  const suggested = loadedMatches
    ? loadedMatches.some(({ volunteerId }) => volunteerId === scope.volunteerId)
    : await request.server.db.opportunityVolunteerRepository.existsBy({
        opportunityId,
        volunteerId: scope.volunteerId,
      });
  if (!suggested) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
}
