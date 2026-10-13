import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type AgentKey = "own" | "nearby" | "far";
type Caller = "member" | "nearbyMember" | "volunteer";

describe("tagging NGOs in posts (fe#1053)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `TagNGO ${suffix}`;

  const agents = {} as Record<AgentKey, Agent>;
  const persons = {} as Record<Caller, Person>;
  const cookies = {} as Record<Caller, string>;
  const postIds: number[] = [];

  const request = (
    method: "GET" | "POST",
    url: string,
    as: Caller,
    payload?: object,
  ) =>
    fastify.inject({
      method,
      url,
      payload,
      cookies: { [accessCookieName]: cookies[as] },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const districts: { id: number }[] =
      await fastify.db.agentRepository.manager.query(
        `SELECT id FROM district ORDER BY id LIMIT 2`,
      );
    const districtOf: Record<AgentKey, number> = {
      own: districts[0].id,
      nearby: districts[0].id,
      far: districts[1].id,
    };
    for (const key of Object.keys(districtOf) as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `${prefix} ${key}`,
          engagementStatus: AgentEngagementStatusType.ACTIVE,
          districtId: districtOf[key],
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const callers: Record<Caller, { role: UserRole; agent?: AgentKey }> = {
      member: { role: UserRole.AGENT, agent: "own" },
      nearbyMember: { role: UserRole.AGENT, agent: "nearby" },
      volunteer: { role: UserRole.VOLUNTEER },
    };
    for (const [caller, { role, agent }] of Object.entries(callers) as [
      Caller,
      { role: UserRole; agent?: AgentKey },
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Tag", lastName: `${caller}${suffix}` }),
      );
      persons[caller] = person;
      const email = `tag-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      if (agent) {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agents[agent].id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    for (const id of postIds) {
      await fastify.db.postRepository.delete({ id });
    }
    for (const agent of Object.values(agents)) {
      await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    }
    for (const person of Object.values(persons)) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const agent of Object.values(agents)) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  describe("GET /agent/tag-candidates", () => {
    it("lists other NGOs, same district first, without the caller's own", async () => {
      const res = await request(
        "GET",
        `/agent/tag-candidates?search=${encodeURIComponent(prefix)}`,
        "member",
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((a: { id: number }) => a.id)).toEqual([
        agents.nearby.id,
        agents.far.id,
      ]);
    });

    it("is closed to volunteers", async () => {
      const res = await request("GET", "/agent/tag-candidates", "volunteer");
      expect(res.statusCode).toBe(403);
    });
  });

  it("tags an NGO's active members and returns the NGO on the post", async () => {
    const res = await request("POST", "/post", "member", {
      text: `Hello <@agent:${agents.nearby.id}>`,
      taggedAgentIds: [agents.nearby.id],
    });
    expect(res.statusCode).toBe(201);
    const post = res.json().data;
    postIds.push(post.id);
    expect(post.taggedAgents).toEqual([
      { id: agents.nearby.id, title: agents.nearby.title },
    ]);
    expect(post.taggedPersons.map((p: { id: number }) => p.id)).toContain(
      persons.nearbyMember.id,
    );
  });

  it("rejects an unknown NGO id", async () => {
    const res = await request("POST", "/post", "member", {
      text: "Hello",
      taggedAgentIds: [999999999],
    });
    expect(res.statusCode).toBe(400);
  });
});
