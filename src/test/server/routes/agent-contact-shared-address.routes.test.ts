import { FastifyInstance } from "fastify";
import { AgentRoleType, UserRole } from "need4deed-sdk";
import { In, Not } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("PATCH /agent/:id/contact/:membershipId on an address shared with the agent", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const coordinatorEmail = `coordinator-shared-${suffix}@test.need4deed.org`;
  let coordinatorCookie: string;
  let agentId: number;
  let sharedAddressId: number;
  let sharedPostcodeId: number;
  let contactPersonId: number;
  let membershipId: number;

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

    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    const address = await getRepository(dataSource, Address).save(
      new Address({
        street: "Agent Street 1",
        city: "Berlin",
        postcodeId: postcode.id,
      }),
    );
    sharedAddressId = address.id;
    sharedPostcodeId = postcode.id;

    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Shared Address Agent ${suffix}`,
        addressId: sharedAddressId,
      }),
    );
    agentId = agent.id;

    const person = await fastify.db.personRepository.save(
      new Person({
        firstName: "Shared",
        lastName: `Contact-${suffix}`,
        addressId: sharedAddressId,
      }),
    );
    contactPersonId = person.id;
    const membership = await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: contactPersonId,
        role: AgentRoleType.SOCIAL_WORKER,
      }),
    );
    membershipId = membership.id;
  });

  afterAll(async () => {
    const person = await fastify.db.personRepository.findOneBy({
      id: contactPersonId,
    });
    await fastify.db.agentPersonRepository.delete({ agentId });
    await fastify.db.agentRepository.delete({ id: agentId });
    await fastify.db.personRepository.delete({ id: contactPersonId });
    const addressIds = [sharedAddressId, person?.addressId].filter(
      (id): id is number => typeof id === "number",
    );
    await getRepository(dataSource, Address).delete({ id: In(addressIds) });
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    await fastify.close();
  });

  it("gives the contact its own address and leaves the agent's untouched", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${membershipId}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { addressStreet: "Contact Street 2" },
    });
    expect(res.statusCode).toBe(200);

    const agentAddress = await getRepository(
      dataSource,
      Address,
    ).findOneByOrFail({ id: sharedAddressId });
    expect(agentAddress.street).toBe("Agent Street 1");

    const person = await fastify.db.personRepository.findOneOrFail({
      where: { id: contactPersonId },
      relations: ["address"],
    });
    expect(person.addressId).not.toBe(sharedAddressId);
    expect(person.address.street).toBe("Contact Street 2");
    expect(person.address.postcodeId).toBe(agentAddress.postcodeId);
    expect(person.address.city).toBe("Berlin");
  });
  it("drops the copied city when the postcode changes", async () => {
    const ownCopy = await fastify.db.personRepository.findOneByOrFail({
      id: contactPersonId,
    });
    await fastify.db.personRepository.update(
      { id: contactPersonId },
      { addressId: sharedAddressId },
    );
    await getRepository(dataSource, Address).delete({ id: ownCopy.addressId! });
    const otherPostcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: { id: Not(sharedPostcodeId) },
      order: { id: "ASC" },
    });
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${membershipId}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { addressPostcode: otherPostcode.value },
    });
    expect(res.statusCode).toBe(200);

    const person = await fastify.db.personRepository.findOneOrFail({
      where: { id: contactPersonId },
      relations: ["address"],
    });
    expect(person.address.postcodeId).toBe(otherPostcode.id);
    expect(person.address.city).toBeNull();
  });
});
