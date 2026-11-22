import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("PATCH /person/:id address", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const adminEmail = `admin-person-address-${suffix}@test.need4deed.org`;
  let adminCookie: string;
  let postcodeId: number;
  let postcodeCode: string;
  const personIds: number[] = [];
  const agentIds: number[] = [];

  const addresses = () => getRepository(dataSource, Address);

  async function makePerson(addressId?: number): Promise<Person> {
    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: "Address",
        lastName: `Person-${suffix}`,
        ...(addressId && { addressId }),
      }),
    );
    personIds.push(person.id);
    return person;
  }

  function patch(personId: number, address: Record<string, unknown>) {
    return fastify.inject({
      method: "PATCH",
      url: `/person/${personId}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { address },
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    await fastify.db.userRepository.save(
      new User({
        email: adminEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: adminEmail, password: PASSWORD },
    });
    adminCookie = login.cookies.find((c) => c.name === accessCookieName)!.value;

    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    postcodeId = postcode.id;
    postcodeCode = postcode.value;
  });

  afterAll(async () => {
    const people = await fastify.db.personRepository.findBy({
      id: In(personIds),
    });
    for (const id of agentIds) {
      await fastify.db.agentRepository.delete({ id });
    }
    await fastify.db.personRepository.delete({ id: In(personIds) });
    const addressIds = people
      .map(({ addressId }) => addressId)
      .filter((id): id is number => id !== null);
    if (addressIds.length) {
      await addresses().delete({ id: In(addressIds) });
    }
    await fastify.db.userRepository.delete({ email: adminEmail });
    await fastify.close();
  });

  it("clears street and city of the person's own address in place", async () => {
    const address = await addresses().save(
      new Address({ street: "Own Street 1", city: "Berlin", postcodeId }),
    );
    const person = await makePerson(address.id);

    const res = await patch(person.id, { street: null, city: null });
    expect(res.statusCode).toBe(200);

    const reloaded = await fastify.db.personRepository.findOneOrFail({
      where: { id: person.id },
      relations: ["address"],
    });
    expect(reloaded.addressId).toBe(address.id);
    expect(reloaded.address.street).toBeNull();
    expect(reloaded.address.city).toBeNull();
    expect(reloaded.address.postcodeId).toBe(postcodeId);
  });

  it("copies an address shared with an agent instead of changing the agent's", async () => {
    const shared = await addresses().save(
      new Address({ street: "Agent Street 1", postcodeId }),
    );
    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Person Address Agent ${suffix}`,
        addressId: shared.id,
      }),
    );
    agentIds.push(agent.id);
    const person = await makePerson(shared.id);

    const res = await patch(person.id, { street: null });
    expect(res.statusCode).toBe(200);

    expect((await addresses().findOneByOrFail({ id: shared.id })).street).toBe(
      "Agent Street 1",
    );
    const reloaded = await fastify.db.personRepository.findOneOrFail({
      where: { id: person.id },
      relations: ["address"],
    });
    expect(reloaded.addressId).not.toBe(shared.id);
    expect(reloaded.address.street).toBeNull();
    await fastify.db.agentRepository.delete({ id: agent.id });
    agentIds.pop();
    await addresses().delete({ id: shared.id });
  });

  it("creates an address for a person without one", async () => {
    const person = await makePerson();

    const res = await patch(person.id, {
      street: "New Street 2",
      postcode: { code: postcodeCode },
    });
    expect(res.statusCode).toBe(200);

    const reloaded = await fastify.db.personRepository.findOneOrFail({
      where: { id: person.id },
      relations: ["address"],
    });
    expect(reloaded.address.street).toBe("New Street 2");
    expect(reloaded.address.postcodeId).toBe(postcodeId);
  });

  it("treats clearing the street of a person without an address as a no-op", async () => {
    const person = await makePerson();

    const res = await patch(person.id, { street: null });
    expect(res.statusCode).toBe(200);

    const reloaded = await fastify.db.personRepository.findOneByOrFail({
      id: person.id,
    });
    expect(reloaded.addressId).toBeNull();
  });
  it("400s creating an address without a postcode", async () => {
    const person = await makePerson();
    const res = await patch(person.id, { street: "No Postcode 3" });
    expect(res.statusCode).toBe(400);
  });

  it("400s for an unknown postcode id or code", async () => {
    const person = await makePerson();
    expect(
      (
        await patch(person.id, {
          street: "Unknown 4",
          postcode: { id: 2147483000 },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await patch(person.id, {
          street: "Unknown 5",
          postcode: { code: "99999X" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await fastify.db.personRepository.findOneByOrFail({ id: person.id }))
        .addressId,
    ).toBeNull();
  });

  it("leaves the address alone when the role update is rejected", async () => {
    const address = await addresses().save(
      new Address({ street: "Kept Street 6", postcodeId }),
    );
    const person = await makePerson(address.id);

    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${person.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { address: { street: null }, role: "volunteer-coordinator" },
    });
    expect(res.statusCode).toBe(400);
    expect((await addresses().findOneByOrFail({ id: address.id })).street).toBe(
      "Kept Street 6",
    );
  });
  it("saves an address and person fields in one request", async () => {
    const address = await addresses().save(
      new Address({ street: "Mixed Street 7", postcodeId }),
    );
    const person = await makePerson(address.id);

    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${person.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { firstName: "Mixed", address: { city: "Berlin" } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.firstName).toBe("Mixed");

    const reloaded = await fastify.db.personRepository.findOneOrFail({
      where: { id: person.id },
      relations: ["address"],
    });
    expect(reloaded.firstName).toBe("Mixed");
    expect(reloaded.address.city).toBe("Berlin");
    expect(reloaded.address.street).toBe("Mixed Street 7");
  });

  it("keeps person fields unsaved when the address is rejected", async () => {
    const person = await makePerson();
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${person.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { firstName: "Rejected", address: { street: "No Postcode 8" } },
    });
    expect(res.statusCode).toBe(400);
    expect(
      (await fastify.db.personRepository.findOneByOrFail({ id: person.id }))
        .firstName,
    ).toBe("Address");
  });
});
