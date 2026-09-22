import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import { PersonJSON } from "../../../data/seeds/populate/types";
import { getOrCreatePerson } from "../../../data/seeds/utils";
import { getRepository } from "../../../data/utils";

// be#1025: getOrCreateAddress used to hand every addressless (or
// same-postcode, street-less) Person the same shared Address row instead of
// minting one per Person, which is how many volunteers ended up pointing at
// one Address row in prod.
describe("getOrCreatePerson address seeding (be#1025)", () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const personJSON = (address: PersonJSON["address"]): PersonJSON => ({
    firstName: "Test",
    middleName: "",
    lastName: "Person",
    email: `${randomUUID()}@example.test`,
    phone: `+49${Math.floor(Math.random() * 1e9)}`,
    address,
  });

  it("gives two persons with no address data their own distinct Address row", async () => {
    const a = await getOrCreatePerson(
      personJSON(undefined as unknown as PersonJSON["address"]),
      dataSource,
    );
    const b = await getOrCreatePerson(
      personJSON(undefined as unknown as PersonJSON["address"]),
      dataSource,
    );

    expect(a.addressId).toBeTruthy();
    expect(b.addressId).toBeTruthy();
    expect(a.addressId).not.toBe(b.addressId);
  });

  it("gives two persons with the same postcode and no street their own distinct Address row", async () => {
    const a = await getOrCreatePerson(
      personJSON({ postcode: 12345 }),
      dataSource,
    );
    const b = await getOrCreatePerson(
      personJSON({ postcode: 12345 }),
      dataSource,
    );

    expect(a.addressId).not.toBe(b.addressId);
  });

  it("honors addressData.street instead of always seeding a blank one", async () => {
    const a = await getOrCreatePerson(
      personJSON({ postcode: 12345, street: "Musterstr. 1" }),
      dataSource,
    );

    const addressRepository = getRepository(dataSource, Address);
    const address = await addressRepository.findOneBy({ id: a.addressId });
    expect(address?.street).toBe("Musterstr. 1");
  });
});

// be#1027: getOrCreatePerson used to hand every personless caller (undefined
// personData) the same shared seeded "Anna" Person row instead of minting
// one per caller, same pattern as be#1025's Address fix.
describe("getOrCreatePerson personless seeding (be#1027)", () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it("gives two personless callers their own distinct Person row", async () => {
    const a = await getOrCreatePerson(
      undefined as unknown as PersonJSON,
      dataSource,
    );
    const b = await getOrCreatePerson(
      undefined as unknown as PersonJSON,
      dataSource,
    );

    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });
});
