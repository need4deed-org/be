import { FastifyInstance } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

// be#1075: tagging someone in a comment/post emails their dashboard user
// (only roles that can see the content, never the author, only new tags on
// an edit) and posts to Slack. Both are fire-and-forget, so each test that
// expects an email tags a control recipient and waits for it — by then the
// whole batch of that request has been sent.
describe("tag notifications (be#1075)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const createdPersonIds: number[] = [];
  const createdCommentIds: number[] = [];
  const createdPostIds: number[] = [];
  const cookies: Record<string, string> = {};
  const persons: Record<string, Person> = {};
  const emails: Record<string, string> = {};

  let emailTagged: MockInstance<FastifyInstance["notify"]["emailTagged"]>;
  let tagged: MockInstance<FastifyInstance["notify"]["tagged"]>;

  async function makeUser(key: string, role?: UserRole): Promise<void> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: key, lastName: `Tag${suffix}` }),
    );
    createdPersonIds.push(person.id);
    persons[key] = person;
    if (!role) {
      return;
    }
    emails[key] = `${key.toLowerCase()}-tag-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email: emails[key],
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emails[key], password: PASSWORD },
    });
    const cookie = res.cookies.find((c) => c.name === accessCookieName);
    if (cookie) {
      cookies[key] = cookie.value;
    }
  }

  const ids = (...keys: string[]) => keys.map((k) => persons[k].id);
  const recipients = () =>
    emailTagged.mock.calls.map(([input]) => input.recipient.email).sort();
  const waitForEmailTo = (key: string) =>
    vi.waitFor(() => expect(recipients()).toContain(emails[key]));
  // For "nothing is sent" cases, where there's no control to wait for.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    await makeUser("Cora", UserRole.COORDINATOR);
    await makeUser("Colin", UserRole.COORDINATOR);
    await makeUser("Cleo", UserRole.COORDINATOR);
    await makeUser("Ada", UserRole.AGENT);
    await makeUser("Abe", UserRole.AGENT);
    await makeUser("Vic", UserRole.VOLUNTEER);
    await makeUser("Nobody");
  });

  afterAll(async () => {
    if (createdCommentIds.length) {
      await fastify.db.commentRepository.delete(createdCommentIds);
    }
    if (createdPostIds.length) {
      await fastify.db.postRepository.delete(createdPostIds);
    }
    for (const id of createdPersonIds) {
      await fastify.db.userRepository.delete({ personId: id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    emailTagged = vi
      .spyOn(fastify.notify, "emailTagged")
      .mockResolvedValue(undefined);
    tagged = vi.spyOn(fastify.notify, "tagged").mockResolvedValue(undefined);
  });

  async function postComment(as: string, taggedKeys: string[]) {
    const res = await fastify.inject({
      method: "POST",
      url: "/comment",
      cookies: { [accessCookieName]: cookies[as] },
      payload: {
        text: `comment ${suffix}`,
        entityType: EntityTableName.VOLUNTEER,
        entityId: 4242,
        taggedPersonIds: ids(...taggedKeys),
      },
    });
    if (res.statusCode === 201) {
      createdCommentIds.push(res.json().data.id);
    }
    return res;
  }

  async function postPost(as: string, taggedKeys: string[]) {
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: cookies[as] },
      payload: { text: `post ${suffix}`, taggedPersonIds: ids(...taggedKeys) },
    });
    if (res.statusCode === 201) {
      createdPostIds.push(res.json().data.id);
    }
    return res;
  }

  describe("comments", () => {
    it("POST emails only coordinator/admin users of the tagged, never the author", async () => {
      const res = await postComment("Cora", [
        "Colin",
        "Ada",
        "Vic",
        "Nobody",
        "Cora",
      ]);
      expect(res.statusCode).toBe(201);

      await waitForEmailTo("Colin");
      expect(recipients()).toEqual([emails.Colin]);
      expect(emailTagged.mock.calls[0][0]).toMatchObject({
        authorName: `Cora Tag${suffix}`,
        text: `comment ${suffix}`,
        where: {
          kind: "comment",
          entityType: EntityTableName.VOLUNTEER,
          entityId: 4242,
        },
      });
      expect(tagged).toHaveBeenCalledTimes(1);
      expect(tagged.mock.calls[0][0]).toMatchObject({
        kind: "comment",
        authorName: `Cora Tag${suffix}`,
        text: `comment ${suffix}`,
      });
    });

    it("PATCH notifies only the tags the edit adds", async () => {
      const created = await postComment("Cora", ["Colin"]);
      const { id } = created.json().data;
      await waitForEmailTo("Colin");
      emailTagged.mockClear();
      tagged.mockClear();

      const res = await fastify.inject({
        method: "PATCH",
        url: `/comment/${id}`,
        cookies: { [accessCookieName]: cookies.Cora },
        payload: { taggedPersonIds: ids("Colin", "Cleo") },
      });
      expect(res.statusCode).toBe(200);

      await waitForEmailTo("Cleo");
      expect(recipients()).toEqual([emails.Cleo]);
      expect(tagged).toHaveBeenCalledTimes(1);
      expect(tagged.mock.calls[0][0].taggedNames).toEqual([
        `Cleo Tag${suffix}`,
      ]);
    });

    it("PATCH without taggedPersonIds notifies nobody", async () => {
      const created = await postComment("Cora", ["Colin"]);
      const { id } = created.json().data;
      await waitForEmailTo("Colin");
      emailTagged.mockClear();
      tagged.mockClear();

      const res = await fastify.inject({
        method: "PATCH",
        url: `/comment/${id}`,
        cookies: { [accessCookieName]: cookies.Cora },
        payload: { text: `edited ${suffix}` },
      });
      expect(res.statusCode).toBe(200);

      await settle();
      expect(emailTagged).not.toHaveBeenCalled();
      expect(tagged).not.toHaveBeenCalled();
    });

    it("a failing email never affects the response", async () => {
      emailTagged.mockRejectedValue(new Error("SMTP down"));

      const res = await postComment("Cora", ["Colin"]);

      expect(res.statusCode).toBe(201);
      await vi.waitFor(() => expect(emailTagged).toHaveBeenCalled());
    });
  });

  describe("posts", () => {
    it("POST emails agent/coordinator/admin users of the tagged, never the author", async () => {
      const res = await postPost("Ada", ["Abe", "Colin", "Vic", "Ada"]);
      expect(res.statusCode).toBe(201);

      await waitForEmailTo("Colin");
      expect(recipients()).toEqual([emails.Abe, emails.Colin].sort());
      expect(emailTagged.mock.calls[0][0]).toMatchObject({
        authorName: `Ada Tag${suffix}`,
        where: { kind: "post" },
      });
      expect(tagged).toHaveBeenCalledTimes(1);
      expect(tagged.mock.calls[0][0]).toMatchObject({
        kind: "post",
        authorName: `Ada Tag${suffix}`,
      });
    });

    it("PATCH by the author notifies only the tags the edit adds", async () => {
      const created = await postPost("Ada", ["Colin"]);
      const { id } = created.json().data;
      await waitForEmailTo("Colin");
      emailTagged.mockClear();
      tagged.mockClear();

      const res = await fastify.inject({
        method: "PATCH",
        url: `/post/${id}`,
        cookies: { [accessCookieName]: cookies.Ada },
        payload: { taggedPersonIds: ids("Colin", "Cleo") },
      });
      expect(res.statusCode).toBe(200);

      await waitForEmailTo("Cleo");
      expect(recipients()).toEqual([emails.Cleo]);
      expect(tagged.mock.calls[0][0].taggedNames).toEqual([
        `Cleo Tag${suffix}`,
      ]);
    });

    it("PATCH by a coordinator names the coordinator as the tagger", async () => {
      const created = await postPost("Ada", []);
      const { id } = created.json().data;

      const res = await fastify.inject({
        method: "PATCH",
        url: `/post/${id}`,
        cookies: { [accessCookieName]: cookies.Cora },
        payload: { taggedPersonIds: ids("Colin", "Cora") },
      });
      expect(res.statusCode).toBe(200);

      await waitForEmailTo("Colin");
      // The coordinator tagged themself too — never emailed.
      expect(recipients()).toEqual([emails.Colin]);
      expect(emailTagged.mock.calls[0][0].authorName).toBe(`Cora Tag${suffix}`);
      expect(tagged.mock.calls[0][0].authorName).toBe(`Cora Tag${suffix}`);
    });
  });
});
