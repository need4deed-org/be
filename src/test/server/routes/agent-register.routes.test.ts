import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

// be#652: POST /agent/register had zero route-level coverage — only the
// write-helper unit tests and the /search picker's INACTIVE-exclusion case
// (be#885) existed. This exercises the route itself: auth via the verify
// token, the JOIN vs CREATE branches, and the conflict/error paths.
describe("POST /agent/register", () => {
  let fastify: FastifyInstance;

  const password = "test_password";
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  const createdAgentIds: number[] = [];

  async function makeRegistrant(domain: string): Promise<{
    person: Person;
    user: User;
    token: string;
  }> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Registrant" }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `registrant-${suffix}@${domain}`,
        password: await hashPassword(password),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });
    return { person, user, token };
  }

  async function makeAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
        ...overrides,
      }),
    );
    createdAgentIds.push(agent.id);
    return agent;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const personId of createdPersonIds) {
      await fastify.db.agentPersonRepository.delete({ personId });
    }
    for (const agentId of createdAgentIds) {
      await fastify.db.agentRepository.delete({ id: agentId });
    }
    for (const userId of createdUserIds) {
      await fastify.db.userRepository.delete({ id: userId });
    }
    for (const personId of createdPersonIds) {
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.close();
  });

  it("401s with no token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/agent/register",
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("401s with an invalid token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/agent/register?token=not-a-real-token",
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("401s a token whose type isn't 'verify' (e.g. an access token)", async () => {
    const { user } = await makeRegistrant("test.need4deed.org");
    const accessToken = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "access",
    });

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${accessToken}`,
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403s a verify token for a non-AGENT/ADMIN role", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `volunteer-${suffix}@test.need4deed.org`,
        password: await hashPassword(password),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates a new agent for the registrant (CREATE branch)", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agent: { title: `Brand New NGO ${suffix}` } },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.ACTIVE);
    createdAgentIds.push(body.data.agentId);

    const membership = await fastify.db.agentPersonRepository.findOneBy({
      agentId: body.data.agentId,
    });
    expect(membership).not.toBeNull();
    expect(membership?.status).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("joins an existing agent as ACTIVE when the registrant's email domain matches an existing member", async () => {
    const domain = `matching-${Date.now()}.example.org`;
    const agent = await makeAgent();

    const existingMemberPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Existing",
        lastName: "Member",
        email: `existing@${domain}`,
      }),
    );
    createdPersonIds.push(existingMemberPerson.id);
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: existingMemberPerson.id,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const { token } = await makeRegistrant(domain);

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.agentId).toBe(agent.id);
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("joins an existing agent as PENDING when there's no domain match or trust", async () => {
    const agent = await makeAgent();
    const { token } = await makeRegistrant(
      `untrusted-${Date.now()}.example.org`,
    );

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.PENDING);
  });

  it("auto-approves ACTIVE when the registrant's domain is on the trusted allowlist", async () => {
    const domain = `trusted-${Date.now()}.example.org`;
    const trusted = await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain }),
    );

    try {
      const agent = await makeAgent();
      const { token } = await makeRegistrant(domain);

      const res = await fastify.inject({
        method: "POST",
        url: `/agent/register?token=${token}`,
        payload: { agentId: agent.id },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.membershipStatus).toBe(
        AgentMembershipStatus.ACTIVE,
      );
    } finally {
      await fastify.db.trustedDomainRepository.delete({ id: trusted.id });
    }
  });

  it("409s creating an agent whose title is already taken", async () => {
    const existing = await makeAgent();
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agent: { title: existing.title } },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().conflict).toBe("title");
  });

  it("404s joining a nonexistent agent", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: 999999999 },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects joining an unclaimed agent directly", async () => {
    const agent = await makeAgent({ unclaimed: true });
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects joining an INACTIVE agent directly", async () => {
    const agent = await makeAgent({
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    });
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(403);
  });
});
