import { FastifyInstance } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
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

describe("DELETE /volunteer/:id", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let comment: Comment;
  let agentPerson: Person;
  let coordinatorPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const language = await fastify.db.languageRepository.findOneOrFail({
      where: {},
    });

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-vol-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `agent-vol-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );

    comment = await fastify.db.commentRepository.save(
      new Comment({
        text: "Test comment",
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteer.id,
        languageId: language.id,
        userId: coordinatorUser.id,
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

    agentCookie = await login(`agent-vol-del-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-vol-del-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    // volunteer/deal/comment are deleted by the DELETE /volunteer/:id call
    // itself in the tests below; these are best-effort in case a test fails
    // before reaching that point.
    await fastify.db.commentRepository.delete({ id: comment.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.close();
  });

  it("403s when a non-coordinator tries to delete a volunteer", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent volunteer", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/999999999`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets a coordinator delete a volunteer, cascading its deal and comments", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    expect(
      await fastify.db.volunteerRepository.findOneBy({ id: volunteer.id }),
    ).toBeNull();
    expect(
      await fastify.db.dealRepository.findOneBy({ id: deal.id }),
    ).toBeNull();
    expect(
      await fastify.db.commentRepository.findOneBy({ id: comment.id }),
    ).toBeNull();

    // The underlying Person is untouched by a volunteer delete.
    expect(
      await fastify.db.personRepository.findOneBy({ id: volunteerPerson.id }),
    ).not.toBeNull();
  });
});
