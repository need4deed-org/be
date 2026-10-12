import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

// be#885: an INACTIVE agent must not be offered to a new registrant through
// the self-registration picker, live off the agent's current engagementStatus.
describe("GET /agent/register/search", () => {
  let fastify: FastifyInstance;

  let registrantPerson: Person;
  let registrantUser: User;
  let token: string;
  let activeAgent: Agent;
  let inactiveAgent: Agent;
  let unclaimedAgent: Agent;
  let foreignAgent: Agent;
  let addressedForeignAgent: Agent;
  let postcode: Postcode;
  let address: Address;
  let memberPerson: Person;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    registrantPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Registrant" }),
    );
    registrantUser = await fastify.db.userRepository.save(
      new User({
        email: `registrant@n4d-${suffix}.test`,
        password: await hashPassword("test_password"),
        role: UserRole.AGENT,
        isActive: true,
        personId: registrantPerson.id,
      }),
    );
    token = fastify.jwt.sign({
      id: registrantUser.id,
      email: registrantUser.email,
      type: "verify",
    });

    activeAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Findable Active NGO ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    inactiveAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Findable Inactive NGO ${suffix}`,
        engagementStatus: AgentEngagementStatusType.INACTIVE,
      }),
    );
    foreignAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Findable Foreign NGO ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    postcode = await fastify.db.agentRepository.manager
      .getRepository(Postcode)
      .save(new Postcode({ value: `9${String(Date.now()).slice(-4)}` }));
    address = await fastify.db.agentRepository.manager
      .getRepository(Address)
      .save(new Address({ street: "Findable Allee 12a", postcode }));
    addressedForeignAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Addressed Foreign NGO ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
        addressId: address.id,
      }),
    );
    memberPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Member",
        lastName: `Agent-${suffix}`,
        email: `member@n4d-${suffix}.test`,
      }),
    );
    // Addressless agents match on their title, so they're only searchable
    // by a registrant who may see that title (be#1041).
    for (const agent of [activeAgent, inactiveAgent]) {
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: agent.id,
          personId: memberPerson.id,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
    }
    unclaimedAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Findable Unclaimed NGO ${suffix}`,
        unclaimed: true,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({
      personId: memberPerson.id,
    });
    await fastify.db.personRepository.delete({ id: memberPerson.id });
    await fastify.db.agentRepository.delete({ id: foreignAgent.id });
    await fastify.db.agentRepository.delete({ id: addressedForeignAgent.id });
    await fastify.db.agentRepository.manager
      .getRepository(Address)
      .delete({ id: address.id });
    await fastify.db.agentRepository.manager
      .getRepository(Postcode)
      .delete({ id: postcode.id });
    await fastify.db.agentRepository.delete({ id: activeAgent.id });
    await fastify.db.agentRepository.delete({ id: inactiveAgent.id });
    await fastify.db.agentRepository.delete({ id: unclaimedAgent.id });
    await fastify.db.userRepository.delete({ id: registrantUser.id });
    await fastify.db.personRepository.delete({ id: registrantPerson.id });
    await fastify.close();
  });

  it("400s with no token", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?street=${encodeURIComponent("Findable")}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("401s with an invalid token", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=not-a-real-token&street=${encodeURIComponent("Findable")}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty match list without querying when street is under 3 characters", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=ab`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it("excludes an unclaimed agent from the candidates", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable")}`,
    });

    const ids = res.json().data.map((a: { id: number }) => a.id);
    expect(ids).not.toContain(unclaimedAgent.id);
  });

  it("excludes an INACTIVE agent from the candidates but keeps an ACTIVE one", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable")}`,
    });

    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((a: { id: number }) => a.id);
    expect(ids).toContain(activeAgent.id);
    expect(ids).not.toContain(inactiveAgent.id);
  });

  it("finds the agent again immediately once it flips back to ACTIVE", async () => {
    await fastify.db.agentRepository.update(inactiveAgent.id, {
      engagementStatus: AgentEngagementStatusType.ACTIVE,
    });

    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable")}`,
    });

    const ids = res.json().data.map((a: { id: number }) => a.id);
    expect(ids).toContain(inactiveAgent.id);
  });

  // be#1041: an org's title is only revealed to a registrant whose email
  // domain would let them JOIN it as ACTIVE; others just learn it exists.
  it("reveals the title of an agent with a member on the registrant's email domain", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable")}`,
    });

    const match = res
      .json()
      .data.find((a: { id: number }) => a.id === activeAgent.id);
    expect(match).toEqual({ id: activeAgent.id, title: activeAgent.title });
  });

  it("returns an addressed agent with no member on the registrant's domain, without its title, for its exact street and house number", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("findable allee 12a")}`,
    });

    const match = res
      .json()
      .data.find((a: { id: number }) => a.id === addressedForeignAgent.id);
    expect(match).toEqual({ id: addressedForeignAgent.id });
  });

  it("doesn't reveal a title through a PENDING member on the registrant's domain", async () => {
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: addressedForeignAgent.id,
        personId: memberPerson.id,
        status: AgentMembershipStatus.PENDING,
      }),
    );

    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("findable allee 12a")}`,
    });

    await fastify.db.agentPersonRepository.delete({
      agentId: addressedForeignAgent.id,
      personId: memberPerson.id,
    });
    const match = res
      .json()
      .data.find((a: { id: number }) => a.id === addressedForeignAgent.id);
    expect(match).toEqual({ id: addressedForeignAgent.id });
  });

  it("omits an addressed agent whose title the registrant can't see on a street prefix", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable Allee")}`,
    });

    const ids = res.json().data.map((a: { id: number }) => a.id);
    expect(ids).not.toContain(addressedForeignAgent.id);
  });

  it("omits an addressless agent whose title the registrant can't see, so its title can't be probed", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/search?token=${token}&street=${encodeURIComponent("Findable Foreign")}`,
    });

    const ids = res.json().data.map((a: { id: number }) => a.id);
    expect(ids).not.toContain(foreignAgent.id);
  });
});

describe("GET /agent/register/search rate limiting", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("limits to 30 requests per minute", async () => {
    const url = "/agent/register/search?token=not-a-real-token&street=abc";
    for (let i = 0; i < 30; i++) {
      const res = await fastify.inject({ method: "GET", url });
      expect(res.statusCode).not.toBe(429);
    }

    const res = await fastify.inject({ method: "GET", url });
    expect(res.statusCode).toBe(429);
  });
});
