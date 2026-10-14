import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
type Caller = "member" | "nearbyMember" | "volunteer" | "coordinator";

describe("tagging NGOs in posts (fe#1053)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `TagNGO ${suffix}`;

  const agents = {} as Record<AgentKey, Agent>;
  const persons = {} as Record<Caller, Person>;
  const cookies = {} as Record<Caller, string>;
  const postIds: number[] = [];

  const request = (
    method: "GET" | "POST" | "PATCH",
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
      coordinator: { role: UserRole.COORDINATOR },
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

  const notifiedNames = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.flatMap(
      ([event]) => (event as { taggedNames: string[] }).taggedNames,
    );

  it("tags an NGO, notifies its active members, and keeps them out of taggedPersons", async () => {
    const spy = vi.spyOn(fastify.notify, "tagged");
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
    expect(post.taggedPersons).toEqual([]);
    expect(notifiedNames(spy).join(" ")).toContain(`nearbyMember${suffix}`);
    spy.mockRestore();
  });

  it("rejects an unknown NGO id", async () => {
    const res = await request("POST", "/post", "member", {
      text: "Hello <@agent:999999999>",
      taggedAgentIds: [999999999],
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects taggedAgentIds that aren't tokens in the text", async () => {
    const res = await request("POST", "/post", "member", {
      text: "Hello",
      taggedAgentIds: [agents.nearby.id],
    });
    expect(res.statusCode).toBe(400);
  });

  it("ignores a bare token in the text instead of failing (volunteer)", async () => {
    const res = await request("POST", "/post", "volunteer", {
      text: `Pasted <@agent:${agents.nearby.id}>`,
    });
    expect(res.statusCode).toBe(201);
    postIds.push(res.json().data.id);
    expect(res.json().data.taggedAgents).toEqual([]);
  });

  it("on PATCH notifies only newly tagged NGOs and keeps direct tags when an NGO is removed", async () => {
    const text = `Event <@agent:${agents.nearby.id}>`;
    const created = await request("POST", "/post", "member", {
      text,
      taggedAgentIds: [agents.nearby.id],
      taggedPersonIds: [persons.nearbyMember.id],
    });
    expect(created.statusCode).toBe(201);
    const postId = created.json().data.id;
    postIds.push(postId);

    const spy = vi.spyOn(fastify.notify, "tagged");
    const typo = await request("PATCH", `/post/${postId}`, "member", {
      text: `${text} (fixed)`,
      taggedAgentIds: [agents.nearby.id],
    });
    expect(typo.statusCode).toBe(200);
    expect(spy).not.toHaveBeenCalled();

    const removed = await request("PATCH", `/post/${postId}`, "member", {
      text: "Event without NGOs",
      taggedAgentIds: [],
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().data.taggedAgents).toEqual([]);
    expect(
      removed.json().data.taggedPersons.map((p: { id: number }) => p.id),
    ).toEqual([persons.nearbyMember.id]);

    const readded = await request("PATCH", `/post/${postId}`, "member", {
      text: `Back <@agent:${agents.far.id}>`,
      taggedAgentIds: [agents.far.id],
    });
    expect(readded.json().data.taggedAgents).toEqual([
      { id: agents.far.id, title: agents.far.title },
    ]);
    spy.mockRestore();
  });

  it("still saves a post whose text holds a token that isn't tagged", async () => {
    const created = await request("POST", "/post", "member", {
      text: "Stale <@agent:999999999>",
    });
    const postId = created.json().data.id;
    postIds.push(postId);

    const res = await request("PATCH", `/post/${postId}`, "member", {
      text: "Stale <@agent:999999999> edited",
      taggedAgentIds: [],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.taggedAgents).toEqual([]);
  });

  it("won't let an editor tag the post's own NGO", async () => {
    const created = await request("POST", "/post", "member", {
      text: "Own post",
    });
    const postId = created.json().data.id;
    postIds.push(postId);

    const res = await request("PATCH", `/post/${postId}`, "coordinator", {
      text: `Own post <@agent:${agents.own.id}>`,
      taggedAgentIds: [agents.own.id],
    });
    expect(res.statusCode).toBe(400);
  });

  it("keeps a tag hidden because its NGO was unclaimed when the client round-trips the visible ones", async () => {
    const text = `Hidden <@agent:${agents.nearby.id}> <@agent:${agents.far.id}>`;
    const created = await request("POST", "/post", "member", {
      text,
      taggedAgentIds: [agents.nearby.id, agents.far.id],
    });
    const postId = created.json().data.id;
    postIds.push(postId);

    await fastify.db.agentRepository.update(agents.far.id, {
      unclaimed: true,
    });
    try {
      const res = await request("PATCH", `/post/${postId}`, "member", {
        text: `${text} edited`,
        taggedAgentIds: [agents.nearby.id],
      });
      expect(res.statusCode).toBe(200);
      const stored = await fastify.db.postRepository.findOne({
        where: { id: postId },
        relations: ["taggedAgents"],
      });
      expect(stored?.taggedAgents.map((a) => a.id).sort()).toEqual(
        [agents.nearby.id, agents.far.id].sort(),
      );
    } finally {
      await fastify.db.agentRepository.update(agents.far.id, {
        unclaimed: false,
      });
    }
  });

  it("doesn't re-notify a member already reached through another tagged NGO", async () => {
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agents.far.id,
        personId: persons.nearbyMember.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
    const created = await request("POST", "/post", "member", {
      text: `Both <@agent:${agents.nearby.id}>`,
      taggedAgentIds: [agents.nearby.id],
    });
    const postId = created.json().data.id;
    postIds.push(postId);

    const spy = vi.spyOn(fastify.notify, "tagged");
    const res = await request("PATCH", `/post/${postId}`, "member", {
      text: `Both <@agent:${agents.nearby.id}> <@agent:${agents.far.id}>`,
      taggedAgentIds: [agents.nearby.id, agents.far.id],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.taggedAgents).toHaveLength(2);
    expect(notifiedNames(spy).join(" ")).not.toContain(`nearbyMember${suffix}`);
    spy.mockRestore();
    await fastify.db.agentPersonRepository.delete({
      agentId: agents.far.id,
      personId: persons.nearbyMember.id,
    });
  });
});
