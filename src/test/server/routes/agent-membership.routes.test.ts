import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

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

// be#652: GET/PATCH/DELETE /agent/membership had zero route-level coverage.
describe("/agent/membership", () => {
  let fastify: FastifyInstance;

  const password = "test_password";
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let volunteerPerson: Person;
  let volunteerCookie: string;

  const createdPersonIds: number[] = [];
  const createdAgentIds: number[] = [];
  const createdMembershipIds: number[] = [];

  async function makeMembership(
    status: AgentMembershipStatus,
  ): Promise<{ agent: Agent; person: Person; membership: AgentPerson }> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Membership Test Agent ${suffix}` }),
    );
    createdAgentIds.push(agent.id);

    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Member" }),
    );
    createdPersonIds.push(person.id);

    const membership = await fastify.db.agentPersonRepository.save(
      new AgentPerson({ agentId: agent.id, personId: person.id, status }),
    );
    createdMembershipIds.push(membership.id);

    return { agent, person, membership };
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const pwHash = await hashPassword(password);

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const coordinatorLoginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-${suffix}@test.need4deed.org`,
        password,
      },
    });
    coordinatorCookie = getCookie(
      coordinatorLoginRes.cookies,
      accessCookieName,
    );

    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `volunteer-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );
    const volunteerLoginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `volunteer-${suffix}@test.need4deed.org`,
        password,
      },
    });
    volunteerCookie = getCookie(volunteerLoginRes.cookies, accessCookieName);
  });

  afterAll(async () => {
    for (const id of createdMembershipIds) {
      await fastify.db.agentPersonRepository.delete({ id });
    }
    for (const agentId of createdAgentIds) {
      await fastify.db.agentRepository.delete({ id: agentId });
    }
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    for (const personId of createdPersonIds) {
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.close();
  });

  describe("GET /", () => {
    it("defaults to listing PENDING memberships", async () => {
      const { membership } = await makeMembership(
        AgentMembershipStatus.PENDING,
      );

      const res = await fastify.inject({
        method: "GET",
        url: "/agent/membership",
        cookies: { [accessCookieName]: coordinatorCookie },
      });

      expect(res.statusCode).toBe(200);
      const ids = res.json().data.map((m: { id: number }) => m.id);
      expect(ids).toContain(membership.id);
    });

    it("lists ACTIVE memberships when status=active is passed", async () => {
      const { membership } = await makeMembership(AgentMembershipStatus.ACTIVE);

      const res = await fastify.inject({
        method: "GET",
        url: "/agent/membership?status=active",
        cookies: { [accessCookieName]: coordinatorCookie },
      });

      expect(res.statusCode).toBe(200);
      const ids = res.json().data.map((m: { id: number }) => m.id);
      expect(ids).toContain(membership.id);
    });

    it("rejects a non-coordinator", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: "/agent/membership",
        cookies: { [accessCookieName]: volunteerCookie },
      });

      expect(res.statusCode).toBe(403);
    });

    it("rejects an unauthenticated caller", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: "/agent/membership",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PATCH /:id", () => {
    it("updates a membership's status", async () => {
      const { membership } = await makeMembership(
        AgentMembershipStatus.PENDING,
      );

      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/membership/${membership.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { status: AgentMembershipStatus.ACTIVE },
      });

      expect(res.statusCode).toBe(200);
      const updated = await fastify.db.agentPersonRepository.findOneByOrFail({
        id: membership.id,
      });
      expect(updated.status).toBe(AgentMembershipStatus.ACTIVE);
    });

    it("404s a nonexistent membership id", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: "/agent/membership/999999999",
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { status: AgentMembershipStatus.ACTIVE },
      });

      expect(res.statusCode).toBe(404);
    });

    it("rejects a non-coordinator", async () => {
      const { membership } = await makeMembership(
        AgentMembershipStatus.PENDING,
      );

      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/membership/${membership.id}`,
        cookies: { [accessCookieName]: volunteerCookie },
        payload: { status: AgentMembershipStatus.ACTIVE },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /:id", () => {
    it("removes the membership", async () => {
      const { membership } = await makeMembership(
        AgentMembershipStatus.PENDING,
      );

      const res = await fastify.inject({
        method: "DELETE",
        url: `/agent/membership/${membership.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
      });

      expect(res.statusCode).toBe(200);
      const gone = await fastify.db.agentPersonRepository.findOneBy({
        id: membership.id,
      });
      expect(gone).toBeNull();
    });

    it("404s a nonexistent membership id", async () => {
      const res = await fastify.inject({
        method: "DELETE",
        url: "/agent/membership/999999999",
        cookies: { [accessCookieName]: coordinatorCookie },
      });

      expect(res.statusCode).toBe(404);
    });

    it("rejects a non-coordinator", async () => {
      const { membership } = await makeMembership(
        AgentMembershipStatus.PENDING,
      );

      const res = await fastify.inject({
        method: "DELETE",
        url: `/agent/membership/${membership.id}`,
        cookies: { [accessCookieName]: volunteerCookie },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
