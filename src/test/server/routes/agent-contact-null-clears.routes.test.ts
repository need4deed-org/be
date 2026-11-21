import { FastifyInstance } from "fastify";
import { AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("PATCH /agent/:id/contact/:membershipId null clears", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const coordinatorEmail = `coordinator-clears-${suffix}@test.need4deed.org`;
  let coordinatorCookie: string;
  let agentId: number;
  let postcode: string;
  const createdPersonIds: number[] = [];

  async function createContact(
    extra: Record<string, string> = {},
  ): Promise<{ membershipId: number; personId: number }> {
    const res = await fastify.inject({
      method: "POST",
      url: `/agent/${agentId}/contact`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        firstName: "Clear",
        lastName: `Contact-${suffix}`,
        role: AgentRoleType.SOCIAL_WORKER,
        ...extra,
      },
    });
    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    createdPersonIds.push(data.person.id);
    return { membershipId: data.id, personId: data.person.id };
  }

  function patch(membershipId: number, payload: Record<string, unknown>) {
    return fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${membershipId}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload,
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    await fastify.db.userRepository.save(
      new User({
        email: coordinatorEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: coordinatorEmail, password: PASSWORD },
    });
    coordinatorCookie = login.cookies.find(
      (c) => c.name === accessCookieName,
    )!.value;

    const agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Contact Clears Agent ${suffix}` }),
    );
    agentId = agent.id;
    postcode = (await firstSeeded(fastify.db.postcodeRepository)).value;
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId });
    await fastify.db.agentRepository.delete({ id: agentId });
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    await fastify.close();
  });

  it("stores NULL for cleared contact fields", async () => {
    const { membershipId, personId } = await createContact({
      middleName: "Middle",
      email: `contact-${suffix}@test.need4deed.org`,
      phone: "+4915100000001",
      landline: "+49301234567",
    });

    const res = await patch(membershipId, {
      middleName: null,
      email: null,
      phone: null,
      landline: null,
    });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneByOrFail({
      id: personId,
    });
    expect(person.middleName).toBeNull();
    expect(person.email).toBeNull();
    expect(person.phone).toBeNull();
    expect(person.landline).toBeNull();
    expect(person.firstName).toBe("Clear");
  });

  it("rejects null on a required name", async () => {
    const { membershipId } = await createContact();
    const res = await patch(membershipId, { lastName: null });
    expect(res.statusCode).toBe(400);
  });

  it("clears the street and keeps the address", async () => {
    const { membershipId, personId } = await createContact({
      addressStreet: "Teststraße 1",
      addressPostcode: postcode,
    });
    const { addressId } = await fastify.db.personRepository.findOneByOrFail({
      id: personId,
    });

    const res = await patch(membershipId, { addressStreet: null });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneOrFail({
      where: { id: personId },
      relations: ["address"],
    });
    expect(person.addressId).toBe(addressId);
    expect(person.address.street).toBeNull();
  });

  it("treats an empty street like null", async () => {
    const { membershipId, personId } = await createContact({
      addressStreet: "Teststraße 4",
      addressPostcode: postcode,
    });

    const res = await patch(membershipId, { addressStreet: "" });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneOrFail({
      where: { id: personId },
      relations: ["address"],
    });
    expect(person.address.street).toBeNull();
  });

  it("refuses to clear the postcode alone", async () => {
    const { membershipId } = await createContact({
      addressStreet: "Teststraße 2",
      addressPostcode: postcode,
    });
    const res = await patch(membershipId, { addressPostcode: null });
    expect(res.statusCode).toBe(400);
  });

  it("removes the address when street and postcode are cleared together", async () => {
    const { membershipId, personId } = await createContact({
      addressStreet: "Teststraße 3",
      addressPostcode: postcode,
    });
    const { addressId } = await fastify.db.personRepository.findOneByOrFail({
      id: personId,
    });

    const res = await patch(membershipId, {
      addressStreet: null,
      addressPostcode: null,
    });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneByOrFail({
      id: personId,
    });
    expect(person.addressId).toBeNull();
    expect(
      await getRepository(dataSource, Address).findOneBy({ id: addressId }),
    ).toBeNull();
  });

  it("treats clearing the street of a contact without an address as a no-op", async () => {
    const { membershipId, personId } = await createContact();
    const res = await patch(membershipId, { addressStreet: null });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneByOrFail({
      id: personId,
    });
    expect(person.addressId).toBeNull();
  });
});
