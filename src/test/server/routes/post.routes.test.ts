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

    const listRes = await fastify.inject({
      method: "GET",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(listRes.statusCode).toBe(200);
    const replies = listRes.json().data;
    expect(replies.map((r: { id: number }) => r.id)).toEqual([
      reply1.id,
      reply2.id,
    ]);
    expect(replies[0].parentReplyId).toBeNull();
    expect(replies[1].parentReplyId).toBe(reply1.id);
  });

  it("returns an empty list for GET /post/:id/reply when the role can't view posts", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for volunteer reply-list test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "GET",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(res.json()).not.toHaveProperty("count");
  });

  it("returns an empty list (not 404) for a disallowed role on a nonexistent post", async () => {
    // Deliberate: matches GET /post's convention of not leaking whether a
    // post exists to a role that can't view posts at all.
    const res = await fastify.inject({
      method: "GET",
      url: "/post/999999999/reply",
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it("404s GET /post/:id/reply for a nonexistent post", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/post/999999999/reply",
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(404);
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

  it("400s when parentReplyId equals the post's own id", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for self-referencing parentReplyId test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "Self-referencing", parentReplyId: postId },
    });
    expect(res.statusCode).toBe(400);
  });

  it("403s a volunteer on reply PATCH/DELETE without hitting the DB for a nonexistent reply id", async () => {
    const patchRes = await fastify.inject({
      method: "PATCH",
      url: "/post/reply/999999999",
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { text: "Should not be allowed" },
    });
    expect(patchRes.statusCode).toBe(403);

    const deleteRes = await fastify.inject({
      method: "DELETE",
      url: "/post/reply/999999999",
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(deleteRes.statusCode).toBe(403);
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

  it("reacting again with a different emoji replaces (not duplicates) the reaction, and PATCH doesn't lose it", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for reaction test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const react1 = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { emoji: "👍" },
    });
    expect(react1.statusCode).toBe(204);

    const react2 = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { emoji: "👍" },
    });
    expect(react2.statusCode).toBe(204);

    const listRes = await fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: agentCookie },
    });
    let listedPost = listRes
      .json()
      .data.find((p: { id: number }) => p.id === postId);
    expect(listedPost.reactions).toEqual([{ emoji: "👍", count: 2 }]);
    expect(listedPost.myReaction).toBe("👍");

    // Replace the agent's own reaction — upsert, not a second row.
    const react3 = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { emoji: "❤️" },
    });
    expect(react3.statusCode).toBe(204);

    const listRes2 = await fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: agentCookie },
    });
    listedPost = listRes2
      .json()
      .data.find((p: { id: number }) => p.id === postId);
    expect(listedPost.myReaction).toBe("❤️");
    expect(
      listedPost.reactions.reduce(
        (sum: number, r: { count: number }) => sum + r.count,
        0,
      ),
    ).toBe(2);

    // PATCH must not silently reset reactions/myReaction to empty.
    const patchRes = await fastify.inject({
      method: "PATCH",
      url: `/post/${postId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for reaction test, edited" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().data.myReaction).toBe("❤️");

    const deleteRes = await fastify.inject({
      method: "DELETE",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(deleteRes.statusCode).toBe(204);

    // Idempotent — deleting an already-absent reaction still succeeds.
    const deleteAgainRes = await fastify.inject({
      method: "DELETE",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(deleteAgainRes.statusCode).toBe(204);
  });

  it("supports reacting to a reply", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for reply reaction test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const replyRes = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { postId, text: "A reply to react to" },
    });
    const replyId = replyRes.json().data.id;
    createdPostIds.push(replyId);

    const reactRes = await fastify.inject({
      method: "POST",
      url: `/post/reply/${replyId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { emoji: "🎉" },
    });
    expect(reactRes.statusCode).toBe(204);

    const listRes = await fastify.inject({
      method: "GET",
      url: `/post/${postId}/reply`,
      cookies: { [accessCookieName]: agentCookie },
    });
    const reply = listRes
      .json()
      .data.find((r: { id: number }) => r.id === replyId);
    expect(reply.reactions).toEqual([{ emoji: "🎉", count: 1 }]);
    expect(reply.myReaction).toBe("🎉");

    const deleteRes = await fastify.inject({
      method: "DELETE",
      url: `/post/reply/${replyId}/reaction`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it("403s when a volunteer tries to react", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for volunteer reaction test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/reaction`,
      cookies: { [accessCookieName]: volunteerCookie },
      payload: { emoji: "👍" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("bookmarks a post, reports it on GET /post and PATCH, and un-bookmarking is idempotent", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for bookmark test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const bookmarkRes = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/bookmark`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(bookmarkRes.statusCode).toBe(204);

    // Bookmarking again (double-tap) must not error — upsert, not insert.
    const bookmarkAgainRes = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/bookmark`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(bookmarkAgainRes.statusCode).toBe(204);

    const listRes = await fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: agentCookie },
    });
    const listedPost = listRes
      .json()
      .data.find((p: { id: number }) => p.id === postId);
    expect(listedPost.bookmarked).toBe(true);

    // Bookmarked is scoped per-user — the coordinator never bookmarked it.
    const listResOther = await fastify.inject({
      method: "GET",
      url: "/post?limit=100",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const listedPostOther = listResOther
      .json()
      .data.find((p: { id: number }) => p.id === postId);
    expect(listedPostOther.bookmarked).toBe(false);

    // PATCH must not silently reset bookmarked to false.
    const patchRes = await fastify.inject({
      method: "PATCH",
      url: `/post/${postId}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for bookmark test, edited" },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().data.bookmarked).toBe(true);

    const unbookmarkRes = await fastify.inject({
      method: "DELETE",
      url: `/post/${postId}/bookmark`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(unbookmarkRes.statusCode).toBe(204);

    // Idempotent — un-bookmarking an already-absent bookmark still succeeds.
    const unbookmarkAgainRes = await fastify.inject({
      method: "DELETE",
      url: `/post/${postId}/bookmark`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(unbookmarkAgainRes.statusCode).toBe(204);
  });

  it("403s when a volunteer tries to bookmark", async () => {
    const postRes = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: agentCookie },
      payload: { text: "Post for volunteer bookmark test" },
    });
    const postId = postRes.json().data.id;
    createdPostIds.push(postId);

    const res = await fastify.inject({
      method: "POST",
      url: `/post/${postId}/bookmark`,
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(res.statusCode).toBe(403);
  });
});
