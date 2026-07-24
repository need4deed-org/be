import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
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

describe("PATCH /agent/:id organization details", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let otherAgent: Agent;
  let memberPerson: Person;
  let pendingPerson: Person;

  let memberCookie: string;
  let pendingCookie: string;
  let nonMemberCookie: string;
  let plainUserCookie: string;
  let coordinatorCookie: string;
  let adminCookie: string;
  let otherAgentMemberCookie: string;
  let noPersonCookie: string;

  const personIds: number[] = [];
  const orphanUserIds: number[] = [];

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return getCookie(res.cookies, accessCookieName);
  }

  async function createUser(
    label: string,
    role: UserRole,
    suffix: string,
  ): Promise<{ person: Person; email: string }> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: label }),
    );
    personIds.push(person.id);
    const email = `${label.toLowerCase()}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    return { person, email };
  }

  // AGENT-role user with no linked Person at all (data-integrity edge case,
  // not something the registration flow produces, but the handler must not
  // crash and must deny rather than throw).
  async function createUserWithoutPerson(
    label: string,
    role: UserRole,
    suffix: string,
  ): Promise<{ email: string }> {
    const email = `${label.toLowerCase()}-${suffix}@test.need4deed.org`;
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
      }),
    );
    orphanUserIds.push(user.id);
    return { email };
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent ${suffix}` }),
    );

    const member = await createUser("Member", UserRole.AGENT, suffix);
    memberPerson = member.person;
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: memberPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const pending = await createUser("Pending", UserRole.AGENT, suffix);
    pendingPerson = pending.person;
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: pendingPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.PENDING,
      }),
    );

    const nonMember = await createUser("NonMember", UserRole.AGENT, suffix);
    const plainUser = await createUser("Plain", UserRole.USER, suffix);
    const coordinator = await createUser(
      "Coordinator",
      UserRole.COORDINATOR,
      suffix,
    );
    const admin = await createUser("Admin", UserRole.ADMIN, suffix);

    otherAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Other Agent ${suffix}` }),
    );
    const otherAgentMember = await createUser(
      "OtherAgentMember",
      UserRole.AGENT,
      suffix,
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgent.id,
        personId: otherAgentMember.person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const noPerson = await createUserWithoutPerson(
      "NoPerson",
      UserRole.AGENT,
      suffix,
    );

    memberCookie = await login(member.email);
    pendingCookie = await login(pending.email);
    nonMemberCookie = await login(nonMember.email);
    plainUserCookie = await login(plainUser.email);
    coordinatorCookie = await login(coordinator.email);
    adminCookie = await login(admin.email);
    otherAgentMemberCookie = await login(otherAgentMember.email);
    noPersonCookie = await login(noPerson.email);
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentPersonRepository.delete({ agentId: otherAgent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    for (const personId of personIds) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    for (const userId of orphanUserIds) {
      await fastify.db.userRepository.delete({ id: userId });
    }
    await fastify.close();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a plain USER-role caller", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: plainUserCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with no membership at this agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: nonMemberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with only a PENDING membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: pendingCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller who is only an ACTIVE member of a different agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: otherAgentMemberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with no linked person", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: noPersonCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent agent id even with a valid AGENT-role caller", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/999999999`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("allows an AGENT-role caller with an ACTIVE membership to edit org details", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { title: `Updated by member ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updated.title).toBe(`Updated by member ${agent.id}`);
  });

  it("allows a COORDINATOR to edit org details regardless of membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { title: `Updated by coordinator ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it("allows an ADMIN to edit org details regardless of membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { title: `Updated by admin ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);
  });
});
