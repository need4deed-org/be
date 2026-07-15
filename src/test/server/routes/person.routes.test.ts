import { FastifyInstance } from "fastify";
import { AgentRoleType, UserRole } from "need4deed-sdk";
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

describe("PATCH /person/:id representative role", () => {
  let fastify: FastifyInstance;

  let editorPerson: Person;
  let otherPerson: Person;
  let adminPerson: Person;
  let agent: Agent;
  let editorCookie: string;
  let otherCookie: string;
  let adminCookie: string;
  let addressId: number;

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return getCookie(res.cookies, accessCookieName);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const addressRepository = getRepository(dataSource, Address);
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    const address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    addressId = address.id;

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const pwHash = await hashPassword(PASSWORD);

    editorPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: "Representative",
        addressId: address.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `representative-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.USER,
        isActive: true,
        personId: editorPerson.id,
      }),
    );

    otherPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: "Bystander",
        addressId: address.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `bystander-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.USER,
        isActive: true,
        personId: otherPerson.id,
      }),
    );

    adminPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: "Admin",
        addressId: address.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `admin-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.ADMIN,
        isActive: true,
        personId: adminPerson.id,
      }),
    );

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent ${suffix}` }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: editorPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );

    editorCookie = await login(`representative-${suffix}@test.need4deed.org`);
    otherCookie = await login(`bystander-${suffix}@test.need4deed.org`);
    adminCookie = await login(`admin-${suffix}@test.need4deed.org`);
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete({ personId: editorPerson.id });
    await fastify.db.userRepository.delete({ personId: otherPerson.id });
    await fastify.db.userRepository.delete({ personId: adminPerson.id });
    await fastify.db.personRepository.delete({ id: editorPerson.id });
    await fastify.db.personRepository.delete({ id: otherPerson.id });
    await fastify.db.personRepository.delete({ id: adminPerson.id });
    await getRepository(dataSource, Address).delete({ id: addressId });
    await fastify.close();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      payload: { firstName: "Nope" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a non-admin, non-self caller", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      cookies: { [accessCookieName]: otherCookie },
      payload: { role: AgentRoleType.MANAGER, agentId: agent.id },
    });
    expect(res.statusCode).toBe(403);
  });

  it("400s when role is sent without agentId", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      cookies: { [accessCookieName]: editorCookie },
      payload: { role: AgentRoleType.MANAGER },
    });
    expect(res.statusCode).toBe(400);
  });

  it("404s when agentId doesn't match any active membership for the person", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      cookies: { [accessCookieName]: editorCookie },
      payload: { role: AgentRoleType.MANAGER, agentId: 999999999 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("persists a self-edited role change for the given agent membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      cookies: { [accessCookieName]: editorCookie },
      payload: {
        firstName: "TestUpdated",
        role: AgentRoleType.PROJECT_COORDINATOR,
        agentId: agent.id,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.firstName).toBe("TestUpdated");

    const membership = await fastify.db.agentPersonRepository.findOneByOrFail({
      personId: editorPerson.id,
      agentId: agent.id,
    });
    expect(membership.role).toBe(AgentRoleType.PROJECT_COORDINATOR);

    // Survives reload: re-fetching the same row reflects the persisted
    // value, matching what Agent.representative (and dtoSerializeAgent)
    // will read on the next GET.
    const reloaded = await fastify.db.agentPersonRepository.findOneByOrFail({
      personId: editorPerson.id,
      agentId: agent.id,
    });
    expect(reloaded.role).toBe(AgentRoleType.PROJECT_COORDINATOR);
  });

  it("lets an admin edit another person's representative role", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/person/${editorPerson.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { role: AgentRoleType.SOCIAL_WORKER, agentId: agent.id },
    });
    expect(res.statusCode).toBe(200);

    const membership = await fastify.db.agentPersonRepository.findOneByOrFail({
      personId: editorPerson.id,
      agentId: agent.id,
    });
    expect(membership.role).toBe(AgentRoleType.SOCIAL_WORKER);
  });
});
