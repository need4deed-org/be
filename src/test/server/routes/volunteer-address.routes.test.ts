import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

// be#1026: PATCH /volunteer/:id used to patch a caller-supplied Address id
// in place with no check for whether it was shared with another Person —
// this reproduces that scenario directly at the DB level (since #1025
// stopped seeding from creating new shared rows, the only way left to get
// one is to force it, as the historical bulk import did).
describe("PATCH /volunteer/:id does not corrupt a shared Address (be#1026)", () => {
  let fastify: FastifyInstance;
  let addressRepository: Repository<Address>;
  let postcode: Postcode;
  let shared: Address;
  let personA: Person;
  let personB: Person;
  let volunteerA: Volunteer;
  let dealA: Deal;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    addressRepository = dataSource.getRepository(Address);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    shared = await addressRepository.save(
      new Address({ street: "Original Street", postcode }),
    );

    personA = await fastify.db.personRepository.save(
      new Person({
        firstName: "Shared-A",
        lastName: "Volunteer",
        email: `shared-a-${suffix}@example.com`,
        addressId: shared.id,
      }),
    );
    personB = await fastify.db.personRepository.save(
      new Person({
        firstName: "Shared-B",
        lastName: "Volunteer",
        email: `shared-b-${suffix}@example.com`,
        addressId: shared.id,
      }),
    );

    dealA = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerA = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: dealA.id, personId: personA.id }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-shared-addr-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-shared-addr-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.volunteerRepository.delete({ id: volunteerA.id });
    await fastify.db.dealRepository.delete({ id: dealA.id });
    const refreshedA = await fastify.db.personRepository.findOneBy({
      id: personA.id,
    });
    await fastify.db.personRepository.delete({ id: personA.id });
    await fastify.db.personRepository.delete({ id: personB.id });
    if (refreshedA?.addressId && refreshedA.addressId !== shared.id) {
      await addressRepository.delete({ id: refreshedA.addressId });
    }
    await addressRepository.delete({ id: shared.id });
    await fastify.close();
  });

  it("gives personA its own Address instead of patching the row personB still shares", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/volunteer/${volunteerA.id}?language=en`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        person: {
          id: personA.id,
          firstName: personA.firstName,
          email: personA.email,
          address: { id: shared.id, street: "New Street" },
        },
      },
    });
    expect(res.statusCode).toBe(200);

    const refreshedA = await fastify.db.personRepository.findOneByOrFail({
      id: personA.id,
    });
    const refreshedB = await fastify.db.personRepository.findOneByOrFail({
      id: personB.id,
    });

    // personA got repointed to a new, exclusively-owned Address.
    expect(refreshedA.addressId).not.toBe(shared.id);
    const newAddress = await addressRepository.findOneByOrFail({
      id: refreshedA.addressId as number,
    });
    expect(newAddress.street).toBe("New Street");

    // personB — still sharing the original row — is untouched.
    expect(refreshedB.addressId).toBe(shared.id);
    const untouchedShared = await addressRepository.findOneByOrFail({
      id: shared.id,
    });
    expect(untouchedShared.street).toBe("Original Street");
  });
});

// be#1026 review finding: isAddressExclusivelyOwned originally checked the
// total reference count (<=1), not that the *caller* was that one owner —
// so an address exclusively owned by a completely different Person still
// passed as "safe to patch in place".
describe("PATCH /volunteer/:id does not patch an address owned by a different Person (be#1026)", () => {
  let fastify: FastifyInstance;
  let addressRepository: Repository<Address>;
  let postcode: Postcode;
  let addressOwnedByB: Address;
  let personA: Person;
  let personB: Person;
  let volunteerA: Volunteer;
  let dealA: Deal;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    addressRepository = dataSource.getRepository(Address);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    addressOwnedByB = await addressRepository.save(
      new Address({ street: "B's Real Street", postcode }),
    );

    personB = await fastify.db.personRepository.save(
      new Person({
        firstName: "Exclusive-B",
        lastName: "Volunteer",
        email: `exclusive-b-${suffix}@example.com`,
        addressId: addressOwnedByB.id,
      }),
    );
    personA = await fastify.db.personRepository.save(
      new Person({
        firstName: "Exclusive-A",
        lastName: "Volunteer",
        email: `exclusive-a-${suffix}@example.com`,
      }),
    );

    dealA = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerA = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: dealA.id, personId: personA.id }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-other-owner-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-other-owner-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.volunteerRepository.delete({ id: volunteerA.id });
    await fastify.db.dealRepository.delete({ id: dealA.id });
    const refreshedA = await fastify.db.personRepository.findOneBy({
      id: personA.id,
    });
    await fastify.db.personRepository.delete({ id: personA.id });
    await fastify.db.personRepository.delete({ id: personB.id });
    if (refreshedA?.addressId) {
      await addressRepository.delete({ id: refreshedA.addressId });
    }
    await addressRepository.delete({ id: addressOwnedByB.id });
    await fastify.close();
  });

  it("gives personA a new Address instead of patching personB's exclusively-owned one, even though personA has no address of their own", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/volunteer/${volunteerA.id}?language=en`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        person: {
          id: personA.id,
          firstName: personA.firstName,
          email: personA.email,
          // personA's client supplies personB's own address id — a request
          // this route never validated ownership of for non-self callers.
          address: {
            id: addressOwnedByB.id,
            street: "Hijacked Street",
            postcode: { code: postcode.value },
          },
        },
      },
    });
    expect(res.statusCode).toBe(200);

    const refreshedA = await fastify.db.personRepository.findOneByOrFail({
      id: personA.id,
    });
    const refreshedB = await fastify.db.personRepository.findOneByOrFail({
      id: personB.id,
    });

    // personA never gets pointed at personB's address; the body's id is
    // ignored and personA, who had none, gets a new one from the submitted fields.
    expect(refreshedA.addressId).not.toBe(addressOwnedByB.id);
    expect(refreshedA.addressId).not.toBeNull();
    const created = await addressRepository.findOneByOrFail({
      id: refreshedA.addressId as number,
    });
    expect(created.street).toBe("Hijacked Street");
    expect(created.postcodeId).toBe(postcode.id);

    // personB's address is completely untouched.
    expect(refreshedB.addressId).toBe(addressOwnedByB.id);
    const untouched = await addressRepository.findOneByOrFail({
      id: addressOwnedByB.id,
    });
    expect(untouched.street).toBe("B's Real Street");
  });
});

describe("PATCH /volunteer/:id for a volunteer without an address", () => {
  let fastify: FastifyInstance;
  let person: Person;
  let deal: Deal;
  let volunteer: Volunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let postcode: Postcode;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  const patch = (person: Record<string, unknown>) =>
    fastify.inject({
      method: "PATCH",
      url: `/volunteer/${volunteer.id}?language=en`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { person },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    person = await fastify.db.personRepository.save(
      new Person({
        firstName: "NoAddress",
        lastName: "Volunteer",
        email: `no-address-${suffix}@example.com`,
        phone: "0301234567",
      }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const email = `coordinator-no-address-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    const created = await fastify.db.personRepository.findOneBy({
      id: person.id,
    });
    await fastify.db.personRepository.delete({ id: person.id });
    if (created?.addressId) {
      await dataSource.getRepository(Address).delete({ id: created.addressId });
    }
    await fastify.close();
  });

  it("saves a phone change alongside an empty address, creating no address", async () => {
    const res = await patch({
      id: person.id,
      firstName: person.firstName,
      email: person.email,
      phone: "0307654321",
      address: { id: 0, street: "", city: "" },
    });
    expect(res.statusCode).toBe(200);

    const refreshed = await fastify.db.personRepository.findOneByOrFail({
      id: person.id,
    });
    expect(refreshed.phone).toBe("0307654321");
    expect(refreshed.addressId).toBeNull();
  });

  it("400s for an unknown postcode before writing anything", async () => {
    const before = await fastify.db.personRepository.findOneByOrFail({
      id: person.id,
    });
    const res = await patch({
      id: person.id,
      firstName: person.firstName,
      email: person.email,
      phone: "0300000000",
      address: { street: "Somewhere 1", postcode: { code: "00000" } },
    });
    expect(res.statusCode).toBe(400);

    const refreshed = await fastify.db.personRepository.findOneByOrFail({
      id: person.id,
    });
    expect(refreshed.phone).toBe(before.phone);
    expect(refreshed.addressId).toBeNull();
  });

  it("400s a new address without a postcode", async () => {
    const res = await patch({
      id: person.id,
      firstName: person.firstName,
      email: person.email,
      address: { street: "Only Street 1" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("creates the address, then an empty payload doesn't blank it", async () => {
    const created = await patch({
      id: person.id,
      firstName: person.firstName,
      email: person.email,
      address: { street: "Kept Street 2", postcode: { code: postcode.value } },
    });
    expect(created.statusCode).toBe(200);

    const emptied = await patch({
      id: person.id,
      firstName: person.firstName,
      email: person.email,
      address: { id: 0, street: "", city: "" },
    });
    expect(emptied.statusCode).toBe(200);

    const refreshed = await fastify.db.personRepository.findOneOrFail({
      where: { id: person.id },
      relations: ["address"],
    });
    expect(refreshed.address?.street).toBe("Kept Street 2");
    expect(refreshed.address?.postcodeId).toBe(postcode.id);
  });
});
