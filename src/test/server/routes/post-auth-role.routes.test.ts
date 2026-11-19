import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName, refreshCookieName } from "../../../config/constants";
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

describe("GET /post authorization source", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const personIds: number[] = [];
  const createdPostIds: number[] = [];
  let postId: number;

  async function createUser(label: string, role: UserRole): Promise<User> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: label }),
    );
    personIds.push(person.id);
    return fastify.db.userRepository.save(
      new User({
        email: `${label}-post-auth-role-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
  }

  async function login(user: User) {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    return {
      access: getCookie(res.cookies, accessCookieName),
      refresh: getCookie(res.cookies, refreshCookieName),
    };
  }

  const listPosts = (access: string) =>
    fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: access },
    });

  const listedIds = (res: { json: () => { data: { id: number }[] } }) =>
    res.json().data.map((p) => p.id);

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const author = await createUser("author", UserRole.COORDINATOR);
    const { access } = await login(author);
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: access },
      payload: { text: "Post for auth-role regression test" },
    });
    expect(res.statusCode).toBe(201);
    postId = res.json().data.id;
    createdPostIds.push(postId);
  });

  afterAll(async () => {
    if (createdPostIds.length) {
      await fastify.db.postRepository.delete(createdPostIds);
    }
    for (const personId of personIds) {
      await fastify.db.userRepository.delete({ personId });
    }
    if (personIds.length) {
      await fastify.db.personRepository.delete(personIds);
    }
    await fastify.close();
  });

  it("lists a coordinator's posts with an access token from /auth/refresh", async () => {
    const coordinator = await createUser("coordinator", UserRole.COORDINATOR);
    const { refresh } = await login(coordinator);

    const refreshRes = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshedAccess = getCookie(refreshRes.cookies, accessCookieName);

    const res = await listPosts(refreshedAccess);
    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBeGreaterThan(0);
    expect(listedIds(res)).toContain(postId);
  });

  it("lists posts when the DB role was promoted after the token was issued", async () => {
    const user = await createUser("promoted", UserRole.VOLUNTEER);
    const { access } = await login(user);
    await fastify.db.userRepository.update(user.id, {
      role: UserRole.COORDINATOR,
    });

    const res = await listPosts(access);
    expect(res.statusCode).toBe(200);
    expect(listedIds(res)).toContain(postId);
  });

  it("returns an empty list when the DB role was demoted after the token was issued", async () => {
    const user = await createUser("demoted", UserRole.COORDINATOR);
    const { access } = await login(user);
    await fastify.db.userRepository.update(user.id, {
      role: UserRole.VOLUNTEER,
    });

    const res = await listPosts(access);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });
});
