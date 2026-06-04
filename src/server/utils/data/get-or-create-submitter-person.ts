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
 *   2. Lookup by email (case-insensitive).
 *        - Found     -> overwrite the rac_* fields (name/phone) from this
 *                       submission so blank/stale records get corrected. Only
 *                       fields the form actually provides are touched, so a
 *                       later submission omitting one does not wipe good data.
 *        - Not found -> create Person from rac_*.
 *   3. Either way, upsert an AgentPerson link (VOLUNTEER_COORDINATOR) for
 *      (person, agentId) when one does not already exist.
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
  } else {
    // Refresh the rac_* fields from this submission so blank/stale records get
    // corrected. Only overwrite a field the form actually provides — an empty
    // rac_full_name / rac_phone must not wipe an existing good value.
    let dirty = false;
    const fullName = (body.rac_full_name ?? "").trim();
    if (fullName) {
      const { firstName, lastName } = splitName(fullName, email);
      person.firstName = firstName;
      // Use null (not undefined) when the new name has no last token: TypeORM
      // skips undefined on update, which would leave a stale last name behind
      // (e.g. resubmitting "Cher" over "Mary van der Berg" -> "Cher van der Berg").
      person.lastName = lastName ?? (null as unknown as undefined);
      dirty = true;
    }
    const phone = (body.rac_phone ?? "").trim();
    if (phone) {
      person.phone = phone;
      dirty = true;
    }
    if (dirty) {
      person = await personRepository.save(person);
    }
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
