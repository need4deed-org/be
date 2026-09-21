import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Address from "../../../../data/entity/location/address.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Person from "../../../../data/entity/person.entity";
import { updateAgentContact } from "../../../../server/utils/data/update-agent-contact";

// be#1026: PATCH /agent/:id/contact/:membershipId (updateAgentContact) used
// to patch a caller-supplied Address id in place with no check for whether
// it was shared with another Person, same gap as PATCH /volunteer/:id.
describe("updateAgentContact address handling (be#1026)", () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("re-points the contact to a fresh Address instead of patching one shared with another Person", async () => {
    const postcodeRepository = dataSource.getRepository(Postcode);
    const postcode = await postcodeRepository.findOneOrFail({ where: {} });

    const addressRepository = dataSource.getRepository(Address);
    const shared = await addressRepository.save(
      new Address({ street: "Original Street", postcode }),
    );

    const personRepository = dataSource.getRepository(Person);
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const personA = await personRepository.save(
      new Person({
        firstName: "Contact-A",
        email: `contact-a-${suffix}@example.test`,
        addressId: shared.id,
      }),
    );
    const personB = await personRepository.save(
      new Person({
        firstName: "Contact-B",
        email: `contact-b-${suffix}@example.test`,
        addressId: shared.id,
      }),
    );

    const membership = { person: personA } as AgentPerson;

    await updateAgentContact(membership, { addressStreet: "New Street" });

    const refreshedA = await personRepository.findOneByOrFail({
      id: personA.id,
    });
    const refreshedB = await personRepository.findOneByOrFail({
      id: personB.id,
    });

    expect(refreshedA.addressId).not.toBe(shared.id);
    expect(refreshedB.addressId).toBe(shared.id);

    const untouchedShared = await addressRepository.findOneByOrFail({
      id: shared.id,
    });
    expect(untouchedShared.street).toBe("Original Street");

    const newAddress = await addressRepository.findOneByOrFail({
      id: refreshedA.addressId as number,
    });
    expect(newAddress.street).toBe("New Street");

    await personRepository.delete({ id: personA.id });
    await personRepository.delete({ id: personB.id });
    await addressRepository.delete({ id: shared.id });
    await addressRepository.delete({ id: newAddress.id });
  });
});
