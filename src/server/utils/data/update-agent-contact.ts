import { ApiAgentContactPatch } from "need4deed-sdk";
import { BadRequestError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import { getRepository } from "../../../data/utils";
import {
  createAddress,
  isAddressShared,
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

export async function updateAgentContact(
  membership: AgentPerson,
  input: ApiAgentContactPatch,
): Promise<AgentPerson> {
  const personId = membership.person.id;

  await dataSource.manager.transaction(async (manager) => {
    const personRepository = getRepository(manager, Person);
    const agentPersonRepository = getRepository(manager, AgentPerson);
    const person = membership.person;

    const clearsStreet = input.addressStreet === null;
    const clearsPostcode = input.addressPostcode === null;
    const changesStreet =
      input.addressStreet !== undefined && !(clearsStreet && !person.addressId);

    if (clearsPostcode && !clearsStreet) {
      throw new BadRequestError(
        "An address needs a postcode; clear addressStreet and addressPostcode together to remove it.",
      );
    }

    if (clearsPostcode) {
      if (person.addressId) {
        await personRepository.update({ id: personId }, {
          addressId: null,
        } as unknown as Partial<Person>);
        if (!(await isAddressShared(person.addressId, manager))) {
          await getRepository(manager, Address).delete({
            id: person.addressId,
          });
        }
      }
    } else if (input.addressPostcode || changesStreet) {
      const addressData = (
        changesStreet ? { street: input.addressStreet } : {}
      ) as Partial<Address>;
      const postcodeData = await resolveAddressPostcode(
        input.addressPostcode ?? undefined,
        manager,
      );

      if (person.addressId) {
        const patched = await patchOrReplaceAddress(
          personId,
          { id: person.addressId, ...addressData },
          postcodeData,
          manager,
        );
        if (!patched) {
          throw new BadRequestError("Address not saved.");
        }
      } else {
        const address = await createAddress(addressData, postcodeData, manager);
        if (!address) {
          throw new BadRequestError(
            "Address not saved: a postcode is required.",
          );
        }
        await personRepository.update(
          { id: personId },
          { addressId: address.id },
        );
      }
    }

    const personUpdates = Object.fromEntries(
      PERSON_FIELDS.filter((field) => input[field] !== undefined).map(
        (field) => [field, input[field]],
      ),
    ) as Partial<Person>;

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
