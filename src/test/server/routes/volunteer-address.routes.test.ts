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
