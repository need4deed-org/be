import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

// GET /opportunity returns every agent's opportunities to everyone.
// AGENT caller must only receive their own agent's, resolved from the
// authenticated caller rather than anything the request supplies.
const PASSWORD = "test_password";

describe("GET /opportunity is scoped to an AGENT caller's own agent(s)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const coordinatorEmail = `coordinator-${suffix}@test.need4deed.org`;
  const agentEmail = `agentrole-${suffix}@test.need4deed.org`;

  let coordinatorCookie: string;
  let agentCookie: string;
  let personId: number;

  // Chosen from seeded data
  let ownAgentId: number;
  let otherAgentId: number;
  let ownAgentOpportunityCount: number;
  let totalOpportunityCount: number;

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((cookie) => cookie.name === accessCookieName)!
      .value;
  }

  async function listOpportunities(cookie: string, query = "") {
    return fastify.inject({
      method: "GET",
      url: `/opportunity/?limit=120${query}`,
      cookies: { [accessCookieName]: cookie },
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
    coordinatorCookie = await login(coordinatorEmail);

    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Scope", lastName: `Test-${suffix}` }),
    );
    personId = person.id;

    await fastify.db.userRepository.save(
      new User({
        email: agentEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId,
      }),
    );
    agentCookie = await login(agentEmail);

    // Pick an agent that actually owns opportunities, and a different one that
    // also does, otherwise test 3 can't tell "scoped" from "empty".
    const owned = await fastify.db.opportunityRepository
      .createQueryBuilder("opportunity")
      .select("opportunity.agent_id", "agentId")
      .addSelect("COUNT(*)", "count")
      .where("opportunity.agent_id IS NOT NULL")
      .groupBy("opportunity.agent_id")
      .orderBy("COUNT(*)", "DESC")
      .getRawMany<{ agentId: number; count: string }>();

    ownAgentId = Number(owned[0].agentId);
    otherAgentId = Number(owned[1].agentId);
    ownAgentOpportunityCount = Number(owned[0].count);
    totalOpportunityCount = await fastify.db.opportunityRepository.count();

    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: ownAgentId,
        personId,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ personId });
    await fastify.db.userRepository.delete({ personId });
    await fastify.db.personRepository.delete({ id: personId });
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    await fastify.close();
  });

  it("returns only the caller's own agent's opportunities", async () => {
    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(ownAgentOpportunityCount);
    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every((o: { agentId: number }) => o.agentId === ownAgentId),
    ).toBe(true);
  });

  it("leaves a COORDINATOR seeing every agent's opportunities", async () => {
    const res = await listOpportunities(coordinatorCookie);

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(totalOpportunityCount);
    expect(totalOpportunityCount).toBeGreaterThan(ownAgentOpportunityCount);
  });

  it("keeps an AGENT scoped to their own agent even when filter[agentId] names another", async () => {
    const res = await listOpportunities(
      agentCookie,
      `&filter[agentId]=${otherAgentId}`,
    );

    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(ownAgentOpportunityCount);
    expect(
      data.every((o: { agentId: number }) => o.agentId !== otherAgentId),
    ).toBe(true);
  });

  it("covers every agent a caller is a member of, not just the first", async () => {
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgentId,
        personId,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    const agentIds = new Set(
      res.json().data.map((o: { agentId: number }) => o.agentId),
    );
    expect(agentIds.has(ownAgentId)).toBe(true);
    expect(agentIds.has(otherAgentId)).toBe(true);
  });

  it("returns an empty list for an AGENT with no membership at all", async () => {
    await fastify.db.agentPersonRepository.delete({ personId });

    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });
});
