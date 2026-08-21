import { FastifyInstance } from "fastify";
import { AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

// Regression coverage for the fe#911 visibility guarantee ("a
// coordinator-created agent stays invisible to non-coordinator/admin callers
// until claimed") across every /agent/:id-scoped sibling route, not just
// GET /agent/:id and GET /agent — a route that skips this check would leak
// an unclaimed agent's existence via a response distinguishable from a
// genuinely nonexistent id.
describe("unclaimed-agent visibility across /agent/:id sibling routes", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let coordinatorCookie: string;
  let agentCookie: string;
  let unclaimedAgentId: number;
  const createdPersonIds: number[] = [];

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((c) => c.name === accessCookieName)!.value;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const coordinatorEmail = `coordinator-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email: coordinatorEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );
    coordinatorCookie = await login(coordinatorEmail);

    const agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: `Agent-${suffix}` }),
    );
    createdPersonIds.push(agentPerson.id);
    const agentEmail = `agentrole-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email: agentEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    agentCookie = await login(agentEmail);

    const createRes = await fastify.inject({
      method: "POST",
      url: "/agent",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { title: `Unclaimed Agent ${suffix}` },
    });
    unclaimedAgentId = createRes.json().data.agentId;
  });

  afterAll(async () => {
    await fastify.db.agentRepository.delete({ id: unclaimedAgentId });
    for (const personId of createdPersonIds) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.db.userRepository.delete({
      email: `coordinator-${suffix}@test.need4deed.org`,
    });
    await fastify.close();
  });

  it("GET /agent/:id/opportunity-linked 404s for a non-privileged caller, 200s for a coordinator", async () => {
    const asAgent = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgentId}/opportunity-linked`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(asAgent.statusCode).toBe(404);

    const asCoordinator = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgentId}/opportunity-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(asCoordinator.statusCode).toBe(200);
  });

  it("GET /agent/:id/communication 404s for a non-privileged caller, 200s for a coordinator", async () => {
    const asAgent = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgentId}/communication`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(asAgent.statusCode).toBe(404);

    const asCoordinator = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgentId}/communication`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(asCoordinator.statusCode).toBe(200);
  });

  it("POST /agent/:id/contact 404s for a non-privileged caller instead of leaking existence via 403", async () => {
    const payload = {
      firstName: "Test",
      lastName: "Contact",
      role: AgentRoleType.SOCIAL_WORKER,
    };

    const asAgent = await fastify.inject({
      method: "POST",
      url: `/agent/${unclaimedAgentId}/contact`,
      cookies: { [accessCookieName]: agentCookie },
      payload,
    });
    expect(asAgent.statusCode).toBe(404);

    const asCoordinator = await fastify.inject({
      method: "POST",
      url: `/agent/${unclaimedAgentId}/contact`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload,
    });
    expect(asCoordinator.statusCode).toBe(201);

    const created = asCoordinator.json().data;
    await fastify.db.agentPersonRepository.delete({ id: created.id });
    await fastify.db.personRepository.delete({ id: created.person.id });
  });
});
