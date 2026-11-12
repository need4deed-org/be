import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../../data/data-source";
import Address from "../../../../data/entity/location/address.entity";
import Postcode from "../../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../../data/entity/m2m/agent-person";
import Person from "../../../../data/entity/person.entity";
import { updateAgentContact } from "../../../../server/utils/data/update-agent-contact";
import { randomNumericSuffix } from "../../../random";

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

describe("updateAgentContact postcode resolution", () => {
  const plz = `9${randomNumericSuffix(4)}`;
  let preexistingPostcode = false;
  let person: Person;

  async function contactAddress(): Promise<Address | null> {
    const { addressId } = await dataSource
      .getRepository(Person)
      .findOneByOrFail({ id: person.id });
    return addressId
      ? dataSource
          .getRepository(Address)
          .findOne({ where: { id: addressId }, relations: ["postcode"] })
      : null;
  }

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    preexistingPostcode = await dataSource
      .getRepository(Postcode)
      .existsBy({ value: plz });
    person = await dataSource.getRepository(Person).save(
      new Person({
        firstName: "Contact-PLZ",
        email: `contact-plz-${randomNumericSuffix()}@example.test`,
      }),
    );
  });

  afterAll(async () => {
    const address = await contactAddress();
    await dataSource.getRepository(Person).delete({ id: person.id });
    if (address) {
      await dataSource.getRepository(Address).delete({ id: address.id });
    }
    if (!preexistingPostcode) {
      await dataSource.getRepository(Postcode).delete({ value: plz });
    }
    await dataSource.destroy();
  });

  it("rejects a street without a postcode when the contact has no address", async () => {
    await expect(
      updateAgentContact({ person } as AgentPerson, {
        addressStreet: "Lonely Street 1",
      }),
    ).rejects.toThrow("a postcode is required");
    expect(await contactAddress()).toBeNull();
  });

  it("rejects an invalid postcode when the contact has no address", async () => {
    await expect(
      updateAgentContact({ person } as AgentPerson, {
        addressStreet: "Lonely Street 1",
        addressPostcode: "00999",
      }),
    ).rejects.toThrow("invalid postcode");
    expect(await contactAddress()).toBeNull();
  });

  it("saves a valid German postcode that isn't stored yet", async () => {
    await updateAgentContact({ person } as AgentPerson, {
      addressStreet: "Contact Street 2",
      addressPostcode: plz,
    });

    const address = await contactAddress();
    expect(address?.street).toBe("Contact Street 2");
    expect(address?.postcode.value).toBe(plz);
  });

  it("rejects an invalid postcode and leaves the existing address unchanged", async () => {
    person = await dataSource
      .getRepository(Person)
      .findOneByOrFail({ id: person.id });

    await expect(
      updateAgentContact({ person } as AgentPerson, {
        addressPostcode: "1234x",
      }),
    ).rejects.toThrow("invalid postcode");

    const address = await contactAddress();
    expect(address?.street).toBe("Contact Street 2");
    expect(address?.postcode.value).toBe(plz);
  });
});
