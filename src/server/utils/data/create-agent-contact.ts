import { ApiAgentContactPost } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { createAddress } from "./for-routes";

/**
 * Adds a brand-new contact (Person + AgentPerson membership) to an existing
 * agent, from that agent's own profile — distinct from the self-registration
 * flow (write-agent-registration.ts), which only ever links the
 * *authenticated caller's own* person. This always creates a new Person; it
 * does not look one up by email, since the caller is describing someone
 * else's contact details, not identifying themselves.
 *
 * Address is best-effort: if street+postcode are given but the postcode
 * doesn't resolve to a known Postcode, the contact is still created without
 * an address rather than failing the whole request. Person + AgentPerson are
 * written in one transaction so a partial failure can't leave an orphan
 * Person with no membership.
 */
export async function createAgentContact(
  agentId: number,
  input: ApiAgentContactPost,
): Promise<AgentPerson> {
  let result!: AgentPerson;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);

    let addressId: number | undefined;
    if (input.addressStreet && input.addressPostcode) {
      const address = await createAddress(
        { street: input.addressStreet },
        { value: input.addressPostcode },
        manager,
      );
      addressId = address?.id;
    }

    const person = await personRepository.save(
      new Person({
        firstName: input.firstName,
        middleName: input.middleName || undefined,
        lastName: input.lastName,
        email: input.email || undefined,
        phone: input.phone || undefined,
        landline: input.landline || undefined,
        addressId,
      }),
    );

    const agentPerson = await agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: person.id,
        role: input.role,
      }),
    );
    agentPerson.person = person;

    result = agentPerson;
  });

  return result;
}
