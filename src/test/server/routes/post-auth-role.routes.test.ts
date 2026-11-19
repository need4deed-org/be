import {
  FastifyInstance,
  InjectOptions,
  LightMyRequestResponse,
} from "fastify";
import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
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

type RouteRequest = Pick<InjectOptions, "method" | "url" | "payload">;

type Fixture = { postId: number; replyId: number };

type ResponseCheck = (res: LightMyRequestResponse) => void;

type RouteCase = {
  name: string;
  request: (fixture: Fixture) => RouteRequest;
  expectAllowed: ResponseCheck;
  expectDenied: ResponseCheck;
};

const status =
  (code: number): ResponseCheck =>
  (res) =>
    expect(res.statusCode).toBe(code);

const forbidden =
  (message: string): ResponseCheck =>
  (res) => {
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ message });
  };

const permissionDenied = forbidden("Permission denied.");

describe("post routes authorize on the DB role, not the JWT claim", () => {
  let fastify: FastifyInstance | undefined;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const personIds: number[] = [];
  let authorAccess: string;
  let listAuthorPersonId: number;
  let promotedAccess: string;
  let demotedAccess: string;
  let listedPostId: number;
  let deniedFixture: Fixture;

  const server = () => {
    if (!fastify) {
      throw new Error("server not started");
    }
    return fastify;
  };

  async function createUser(label: string, role: UserRole): Promise<User> {
    const person = await server().db.personRepository.save(
      new Person({ firstName: "Test", lastName: label }),
    );
    personIds.push(person.id);
    return server().db.userRepository.save(
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
    const res = await server().inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    return {
      access: getCookie(res.cookies, accessCookieName),
      refresh: res.json<{ data: { refresh: string } }>().data.refresh,
    };
  }

  async function staleAccess(
    label: string,
    tokenRole: UserRole,
    dbRole: UserRole,
  ): Promise<string> {
    const user = await createUser(label, tokenRole);
    const { access } = await login(user);
    await server().db.userRepository.update(user.id, { role: dbRole });
    return access;
  }

  const send = (access: string, request: RouteRequest) =>
    server().inject({
      ...request,
      cookies: { [accessCookieName]: access },
    });

  async function createPost(access = authorAccess): Promise<number> {
    const res = await send(access, {
      method: "POST",
      url: "/post",
      payload: { text: "Post for auth-role regression test" },
    });
    expect(res.statusCode).toBe(201);
    return res.json().data.id;
  }

  async function createFixture(): Promise<Fixture> {
    const postId = await createPost();
    const res = await send(authorAccess, {
      method: "POST",
      url: `/post/${postId}/reply`,
      payload: { postId, text: "Reply for auth-role regression test" },
    });
    expect(res.statusCode).toBe(201);
    return { postId, replyId: res.json().data.id };
  }

  const listAuthorPosts = (access: string) =>
    send(access, {
      method: "GET",
      url: `/post?authorId=${listAuthorPersonId}`,
    });

  const listedIds = (res: LightMyRequestResponse) =>
    res.json<{ data: { id: number }[] }>().data.map((p) => p.id);

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const author = await createUser("author", UserRole.COORDINATOR);
    authorAccess = (await login(author)).access;
    deniedFixture = await createFixture();

    const listAuthor = await createUser("list-author", UserRole.COORDINATOR);
    listAuthorPersonId = listAuthor.personId;
    listedPostId = await createPost((await login(listAuthor)).access);

    promotedAccess = await staleAccess(
      "promoted",
      UserRole.VOLUNTEER,
      UserRole.COORDINATOR,
    );
    demotedAccess = await staleAccess(
      "demoted",
      UserRole.COORDINATOR,
      UserRole.VOLUNTEER,
    );
  });

  afterAll(async () => {
    if (!fastify) {
      return;
    }
    if (personIds.length) {
      await fastify.db.userRepository.delete({ personId: In(personIds) });
      await fastify.db.personRepository.delete(personIds);
    }
    await fastify.close();
  });

  it("lists a coordinator's posts with an access token from /auth/refresh", async () => {
    const coordinator = await createUser("coordinator", UserRole.COORDINATOR);
    const { refresh } = await login(coordinator);

    const refreshRes = await server().inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(
      server().jwt.decode(refreshRes.json<{ access: string }>().access),
    ).toMatchObject({ role: UserRole.COORDINATOR, type: "access" });

    const res = await listAuthorPosts(
      getCookie(refreshRes.cookies, accessCookieName),
    );
    expect(res.statusCode).toBe(200);
    expect(listedIds(res)).toContain(listedPostId);
  });

  describe("GET /post", () => {
    it("lists posts when the DB role was promoted after the token was issued", async () => {
      const res = await listAuthorPosts(promotedAccess);
      expect(res.statusCode).toBe(200);
      expect(listedIds(res)).toContain(listedPostId);
    });

    it("returns an empty list when the DB role was demoted after the token was issued", async () => {
      const res = await listAuthorPosts(demotedAccess);
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ data: [], count: 0 });
    });
  });

  const routeCases: RouteCase[] = [
    {
      name: "PATCH /post/:id",
      request: ({ postId }) => ({
        method: "PATCH",
        url: `/post/${postId}`,
        payload: { text: "Edited" },
      }),
      expectAllowed: status(200),
      expectDenied: permissionDenied,
    },
    {
      name: "DELETE /post/:id",
      request: ({ postId }) => ({ method: "DELETE", url: `/post/${postId}` }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "POST /post/:id/bookmark",
      request: ({ postId }) => ({
        method: "POST",
        url: `/post/${postId}/bookmark`,
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "DELETE /post/:id/bookmark",
      request: ({ postId }) => ({
        method: "DELETE",
        url: `/post/${postId}/bookmark`,
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "GET /post/:id/reply",
      request: ({ postId }) => ({
        method: "GET",
        url: `/post/${postId}/reply`,
      }),
      expectAllowed: (res) => {
        expect(res.statusCode).toBe(200);
        expect(listedIds(res)).toHaveLength(1);
      },
      expectDenied: (res) => {
        expect(res.statusCode).toBe(200);
        expect(listedIds(res)).toEqual([]);
      },
    },
    {
      name: "POST /post/:id/reply",
      request: ({ postId }) => ({
        method: "POST",
        url: `/post/${postId}/reply`,
        payload: { postId, text: "Reply" },
      }),
      expectAllowed: status(201),
      expectDenied: forbidden(
        "Only agents and coordinators can reply to posts.",
      ),
    },
    {
      name: "PATCH /post/reply/:id",
      request: ({ replyId }) => ({
        method: "PATCH",
        url: `/post/reply/${replyId}`,
        payload: { text: "Edited reply" },
      }),
      expectAllowed: status(200),
      expectDenied: permissionDenied,
    },
    {
      name: "DELETE /post/reply/:id",
      request: ({ replyId }) => ({
        method: "DELETE",
        url: `/post/reply/${replyId}`,
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "POST /post/:id/reaction",
      request: ({ postId }) => ({
        method: "POST",
        url: `/post/${postId}/reaction`,
        payload: { emoji: "👍" },
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "DELETE /post/:id/reaction",
      request: ({ postId }) => ({
        method: "DELETE",
        url: `/post/${postId}/reaction`,
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "POST /post/reply/:id/reaction",
      request: ({ replyId }) => ({
        method: "POST",
        url: `/post/reply/${replyId}/reaction`,
        payload: { emoji: "👍" },
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
    {
      name: "DELETE /post/reply/:id/reaction",
      request: ({ replyId }) => ({
        method: "DELETE",
        url: `/post/reply/${replyId}/reaction`,
      }),
      expectAllowed: status(204),
      expectDenied: permissionDenied,
    },
  ];

  describe.each(routeCases)(
    "$name",
    ({ request, expectAllowed, expectDenied }) => {
      it("allows a token whose role was promoted in the DB", async () => {
        expectAllowed(
          await send(promotedAccess, request(await createFixture())),
        );
      });

      it("denies a token whose role was demoted in the DB", async () => {
        expectDenied(await send(demotedAccess, request(deniedFixture)));
      });
    },
  );
});
