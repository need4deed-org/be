import { FastifyInstance } from "fastify";
import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    registrantPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Registrant" }),
    );
    registrantUser = await fastify.db.userRepository.save(
      new User({
        email: `registrant-${suffix}@test.need4deed.org`,
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
    unclaimedAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Findable Unclaimed NGO ${suffix}`,
        unclaimed: true,
      }),
    );
  });

  afterAll(async () => {
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
});
