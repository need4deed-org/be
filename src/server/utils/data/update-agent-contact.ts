import { ApiAgentContactPatch } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import {
  createAddress,
  deleteAddressIfUnshared,
  patchOrReplaceAddress,
  resolveAddressPostcode,
} from "./for-routes";

const PERSON_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "landline",
] as const;

async function upsertContactAddress(
  person: Person,
  street: string | null | undefined,
  postcode: string | undefined,
  manager: EntityManager,
): Promise<void> {
  const addressData: Partial<Address> =
    street === undefined ? {} : { street: street as string };
  const postcodeData = await resolveAddressPostcode(postcode, manager);

  if (person.addressId) {
    const patched = await patchOrReplaceAddress(
      person.id,
      { id: person.addressId, ...addressData },
      postcodeData,
      manager,
    );
    if (!patched) {
      throw new BadRequestError("Address not saved.");
    }
    return;
  }

  const address = await createAddress(addressData, postcodeData, manager);
  if (!address) {
    throw new BadRequestError("Address not saved: a postcode is required.");
  }
  await getRepository(manager, Person).update(
    { id: person.id },
    { addressId: address.id },
  );
}

export async function updateAgentContact(
  membership: AgentPerson,
  input: ApiAgentContactPatch,
): Promise<AgentPerson> {
  const personId = membership.person.id;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);
    const person = await personRepository.findOneOrFail({
      where: { id: personId },
      lock: { mode: "pessimistic_write" },
    });

    const street = input.addressStreet === "" ? undefined : input.addressStreet;
    const postcode =
      input.addressPostcode === "" ? undefined : input.addressPostcode;

    if (postcode === null && street !== null && person.addressId) {
      throw new BadRequestError(
        "An address needs a postcode; clear addressStreet and addressPostcode together to remove it.",
      );
    }

    const clearsAddress = postcode === null && Boolean(person.addressId);
    if (postcode !== null) {
      if (postcode || (street !== undefined && person.addressId)) {
        await upsertContactAddress(person, street, postcode, manager);
      } else if (street) {
        throw new BadRequestError("Address not saved: a postcode is required.");
      }
    }

    const personUpdates = Object.fromEntries(
      PERSON_FIELDS.filter((field) => input[field] !== undefined).map(
        (field) => [field, input[field]],
      ),
    ) as Partial<Person>;
    if (clearsAddress) {
      personUpdates.addressId = null;
    }

    if (Object.keys(personUpdates).length > 0) {
      await personRepository.update({ id: personId }, personUpdates);
    }
    if (clearsAddress) {
      await deleteAddressIfUnshared(person.addressId!, manager);
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
