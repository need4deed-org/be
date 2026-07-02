import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import User from "../../../data/entity/user.entity";

/**
 * What a non COORDINATOR/ADMIN caller may see UNMASKED, resolved per request
 * (masking-side only). Drives PII masking of persons, an opportunity's
 * accompanying details, and comments.
 *
 *   userId         the caller's user id (a comment they authored is unmasked)
 *   personIds      Person ids whose PII is visible
 *   opportunityIds Opportunities whose accompanying + comments are visible
 *   agentIds       Agents whose comments are visible (caller's memberships)
 *
 * Per role:
 *   USER      -> nothing
 *   VOLUNTEER -> own person; opportunities they're matched to
 *   AGENT     -> own person ∪ members of their agent(s) ∪ persons of volunteers
 *                on their opportunities; their agent(s); their opportunities
 */
export interface CallerVisibility {
  userId: number;
  personIds: Set<number>;
  opportunityIds: Set<number>;
  agentIds: Set<number>;
}

export async function resolveCallerVisibility(
  fastify: FastifyInstance,
  user: User,
): Promise<CallerVisibility> {
  const visibility: CallerVisibility = {
    userId: user.id,
    personIds: new Set<number>(),
    opportunityIds: new Set<number>(),
    agentIds: new Set<number>(),
  };
  const { personIds, opportunityIds, agentIds } = visibility;
  const personId = user.personId ?? undefined;

  // USER sees only reference data; a missing personId can't match anything.
  if (user.role === UserRole.USER || !personId) {
    return visibility;
  }

  personIds.add(personId); // VOLUNTEER + AGENT see their own person

  if (user.role === UserRole.VOLUNTEER) {
    // Opportunities the caller is matched to (own person -> volunteer -> match).
    const rows: { opportunity_id: number }[] =
      await fastify.db.agentPersonRepository.manager.query(
        `SELECT ov.opportunity_id
           FROM opportunity_volunteer ov
           JOIN volunteer v ON v.id = ov.volunteer_id
          WHERE v.person_id = $1`,
        [personId],
      );
    rows.forEach((r) => opportunityIds.add(Number(r.opportunity_id)));
    return visibility;
  }

  if (user.role !== UserRole.AGENT) {
    return visibility;
  }

  const agentPersonRepository = fastify.db.agentPersonRepository;
  const memberships = await agentPersonRepository.find({ where: { personId } });
  memberships.forEach((m) => agentIds.add(m.agentId));
  if (agentIds.size === 0) {
    return visibility;
  }

  // Members of the caller's agent(s).
  const members = await agentPersonRepository.find({
    where: { agentId: In([...agentIds]) },
  });
  members.forEach((m) => personIds.add(m.personId));

  // Opportunities owned by the caller's agent(s), plus the persons of the
  // volunteers matched to them (an agent member sees those volunteers).
  const rows: { id: number; person_id: number | null }[] =
    await agentPersonRepository.manager.query(
      `SELECT o.id, v.person_id
         FROM opportunity o
         LEFT JOIN opportunity_volunteer ov ON ov.opportunity_id = o.id
         LEFT JOIN volunteer v ON v.id = ov.volunteer_id
        WHERE o.agent_id = ANY($1)`,
      [[...agentIds]],
    );
  rows.forEach((r) => {
    opportunityIds.add(Number(r.id));
    if (r.person_id !== null) {
      personIds.add(Number(r.person_id));
    }
  });

  return visibility;
}
