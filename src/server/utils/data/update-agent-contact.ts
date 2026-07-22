import { ApiAgentContactPatch } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import { createAddress, patchAddress } from "./for-routes";

/**
 * Updates an existing contact's Person fields and/or their role on this
 * specific AgentPerson membership. `membership` must already have its
 * `person` relation loaded (the caller resolves and authorizes the
 * membership before calling this).
 *
 * Only the fields present in `input` are touched — undefined fields leave
 * the existing value alone (partial update), matching PATCH /person/:id's
 * behavior. Address is create-or-patch: an existing address is patched in
 * place, a person with none gets a new one created, mirroring the pattern
 * PATCH /agent/:id already uses for the agent's own address.
 */
export async function updateAgentContact(
  membership: AgentPerson,
  input: ApiAgentContactPatch,
): Promise<AgentPerson> {
  const personId = membership.person.id;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);
    const person = membership.person;

    if (input.addressStreet || input.addressPostcode) {
      const addressData = input.addressStreet
        ? { street: input.addressStreet }
        : {};
      const postcodeData = input.addressPostcode
        ? { value: input.addressPostcode }
        : {};

      if (person.addressId) {
        await patchAddress(
          { id: person.addressId, ...addressData },
          postcodeData,
          manager,
        );
      } else {
        const address = await createAddress(addressData, postcodeData, manager);
        if (address) {
          await personRepository.update(
            { id: personId },
            { addressId: address.id },
          );
        }
      }
    }

    const personUpdates: Partial<Person> = {};
    if (input.firstName !== undefined) {
      personUpdates.firstName = input.firstName;
    }
    if (input.middleName !== undefined) {
      personUpdates.middleName = input.middleName;
    }
    if (input.lastName !== undefined) {
      personUpdates.lastName = input.lastName;
    }
    if (input.email !== undefined) {
      personUpdates.email = input.email;
    }
    if (input.phone !== undefined) {
      personUpdates.phone = input.phone;
    }
    if (input.landline !== undefined) {
      personUpdates.landline = input.landline;
    }

    if (Object.keys(personUpdates).length > 0) {
      await personRepository.update({ id: personId }, personUpdates);
    }

    if (input.role !== undefined) {
      membership.role = input.role;
      await agentPersonRepository.save(membership);
    }
  });

  const personRepository = getRepository(dataSource, Person);
  const refreshedPerson = await personRepository.findOne({
    where: { id: personId },
    relations: ["address.postcode"],
  });
  if (refreshedPerson) {
    membership.person = refreshedPerson;
  }

  return membership;
}
