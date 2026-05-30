import { AgentRoleType, OpportunityLegacyFormData } from "need4deed-sdk";
import { DataSource, EntityManager, ILike } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";

type SubmitterFields = Pick<
  OpportunityLegacyFormData,
  "rac_email" | "rac_full_name" | "rac_phone"
>;

function splitName(
  rawName: string | undefined,
  email: string,
): { firstName: string; lastName?: string } {
  const trimmed = (rawName ?? "").trim();
  if (!trimmed) {
    return { firstName: email.split("@")[0] || "unknown" };
  }
  const [first, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: first,
    lastName: rest.length ? rest.join(" ") : undefined,
  };
}

/**
 * Resolve a Person + AgentPerson link for the submitter of a legacy
 * opportunity:
 *
 *   1. Empty/missing rac_email -> return null (no Person manufactured).
 *   2. Lookup by email (case-insensitive). If found + AgentPerson row already
 *      exists for (person, agentId), no-op.
 *   3. Found + no link -> upsert AgentPerson with VOLUNTEER_COORDINATOR role.
 *   4. Not found -> create Person from rac_*; upsert AgentPerson with same
 *      role.
 *
 * `manager` defaults to the global dataSource; pass a transactional
 * EntityManager (or a migration's QueryRunner.manager) to make the writes
 * atomic with surrounding work.
 */
export async function getOrCreateSubmitterPerson(
  body: SubmitterFields,
  agentId: number,
  manager: DataSource | EntityManager = dataSource,
): Promise<Person | null> {
  const email = (body.rac_email ?? "").trim();
  if (!email) {
    return null;
  }

  const personRepository = getRepository(manager, Person);
  const agentPersonRepository = getRepository(manager, AgentPerson);

  let person = await personRepository.findOne({
    where: { email: ILike(email) },
  });

  if (!person) {
    const { firstName, lastName } = splitName(body.rac_full_name, email);
    person = await personRepository.save(
      new Person({
        firstName,
        lastName,
        email,
        phone: body.rac_phone || undefined,
      }),
    );
  }

  const existingLink = await agentPersonRepository.findOne({
    where: { agentId, personId: person.id },
  });
  if (!existingLink) {
    await agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );
  }

  return person;
}
