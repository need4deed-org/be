import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
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

describe("POST /post", () => {
  let fastify: FastifyInstance;

  let agentPerson: Person;
  let coordinatorPerson: Person;
  let volunteerPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  const createdPostIds: number[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `agent-post-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-post-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `volunteer-post-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    agentCookie = await login(`agent-post-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-post-${suffix}@test.need4deed.org`,
    );
    volunteerCookie = await login(
      `volunteer-post-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    if (createdPostIds.length) {
      await fastify.db.postRepository.delete(createdPostIds);
    }
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: volunteerPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.close();
  });

  it("lets an agent create a post", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Test post from agent" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    createdPostIds.push(body.data.id);
    expect(body.data.author.id).toBe(agentPerson.id);
  });

  it("lets a coordinator create a post, with agentId null", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { text: "Test post from coordinator" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    createdPostIds.push(body.data.id);
    expect(body.data.author.id).toBe(coordinatorPerson.id);

    const saved = await fastify.db.postRepository.findOneByOrFail({
      id: body.data.id,
    });
    expect(saved.agentId).toBeNull();
  });

  it("403s when a volunteer tries to create a post", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { text: "Should not be allowed" },
    });
    expect(res.statusCode).toBe(403);
  });
});
