import { FastifyRequest } from "fastify";
import { OpportunityVolunteerStatusType, UserRole } from "need4deed-sdk";

export async function getCallerMatchStatus(
  request: FastifyRequest,
  opportunityId: number,
): Promise<OpportunityVolunteerStatusType | null | undefined> {
  const user = request.authUser;
  if (user?.role !== UserRole.VOLUNTEER) {
    return undefined;
  }
  if (user.personId === null || user.personId === undefined) {
    return null;
  }

  const match = await request.server.db.opportunityVolunteerRepository.findOne({
    where: { opportunityId, volunteer: { personId: user.personId } },
    select: { id: true, status: true },
  });
  return match?.status ?? null;
}
