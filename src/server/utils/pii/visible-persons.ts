import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import User from "../../../data/entity/user.entity";

/**
 * Person ids the caller may see UNMASKED (non COORDINATOR/ADMIN):
 *   USER      -> none
 *   VOLUNTEER -> own person
 *   AGENT     -> own ∪ members of their agent(s) ∪ persons of volunteers on
 *                opportunities owned by their agent(s)
 * Only the AGENT branch hits the DB; resolved per request, masking-side only.
 */
export async function resolveVisiblePersonIds(
  fastify: FastifyInstance,
  user: User,
): Promise<Set<number>> {
  const visible = new Set<number>();
  const personId = user.personId ?? undefined;

  // USER sees only reference data; a missing personId can't match anything.
  if (user.role === UserRole.USER || !personId) {return visible;}

  visible.add(personId); // VOLUNTEER + AGENT see their own person

  if (user.role !== UserRole.AGENT) {return visible;}

  const agentPersonRepository = fastify.db.agentPersonRepository;
  const memberships = await agentPersonRepository.find({ where: { personId } });
  const agentIds = memberships.map((m) => m.agentId);
  if (agentIds.length === 0) {return visible;}

  // Members of the caller's agent(s).
  const members = await agentPersonRepository.find({
    where: { agentId: In(agentIds) },
  });
  members.forEach((m) => visible.add(m.personId));

  // Persons of volunteers on opportunities owned by the caller's agent(s).
  const rows: { person_id: number }[] =
    await agentPersonRepository.manager.query(
      `SELECT DISTINCT v.person_id
       FROM opportunity o
       JOIN opportunity_volunteer ov ON ov.opportunity_id = o.id
       JOIN volunteer v ON v.id = ov.volunteer_id
      WHERE o.agent_id = ANY($1) AND v.person_id IS NOT NULL`,
      [agentIds],
    );
  rows.forEach((r) => visible.add(Number(r.person_id)));

  return visible;
}
