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

  it("excludes replies from GET /post and reports replyCount", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post with a reply" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const replyRes = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "A direct reply" },
    });
    expect(replyRes.statusCode).toBe(201);
    const reply = replyRes.json().data;
    createdPostIds.push(reply.id);
    expect(reply.postId).toBe(postId);
    expect(reply.parentReplyId).toBeNull();

    const listRes = await fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: agentCookie },
    });
    const listedIds = listRes.json().data.map((p: { id: number }) => p.id);
    expect(listedIds).toContain(postId);
    expect(listedIds).not.toContain(reply.id);

    const listedPost = listRes
      .json()
      .data.find((p: { id: number }) => p.id === postId);
    expect(listedPost.replyCount).toBe(1);

    const patchRes = await fastify.inject({
      method: "PATCH",
      url: `/post/${postId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post with a reply, edited" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().data.replyCount).toBe(1);
  });

  it("allows a reply-to-a-reply but rejects a third level of nesting", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post with nested replies" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const reply1Res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "Depth 1" },
    });
    const reply1 = reply1Res.json().data;
    createdPostIds.push(reply1.id);

    const reply2Res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "Depth 2", parentReplyId: reply1.id },
    });
    expect(reply2Res.statusCode).toBe(201);
    const reply2 = reply2Res.json().data;
    createdPostIds.push(reply2.id);
    expect(reply2.postId).toBe(postId);
    expect(reply2.parentReplyId).toBe(reply1.id);

    const reply3Res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        postId,
        text: "Depth 3 — should fail",
        parentReplyId: reply2.id,
      },
    });
    expect(reply3Res.statusCode).toBe(400);
  });

  it("403s when a volunteer tries to reply", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for volunteer reply test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { postId, text: "Should not be allowed" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("400s when the body postId doesn't match the URL post id", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for postId mismatch test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId: postId + 1, text: "Mismatched postId" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("updates and deletes a reply via /post/reply/:id, and guards route boundaries", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for reply edit/delete test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const replyRes = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "Original reply text" },
    });
    const replyId = replyRes.json().data.id;
    createdPostIds.push(replyId);

    // /post/:id (root-only route) must not operate on a reply's id
    const patchAsPostRes = await fastify.inject({
      method: "PATCH",
      url: `/post/${replyId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Should not work" },
    });
    expect(patchAsPostRes.statusCode).toBe(404);

    // /post/reply/:id must not operate on a root post's id
    const patchReplyAsRootRes = await fastify.inject({
      method: "PATCH",
      url: `/post/reply/${postId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Should not work" },
    });
    expect(patchReplyAsRootRes.statusCode).toBe(404);

    const patchRes = await fastify.inject({
      method: "PATCH",
      url: `/post/reply/${replyId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Updated reply text" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().data.text).toBe("Updated reply text");

    const deleteRes = await fastify.inject({
      method: "DELETE",
      url: `/post/reply/${replyId}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(deleteRes.statusCode).toBe(204);
    createdPostIds.splice(createdPostIds.indexOf(replyId), 1);
  });
});
