import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("request bodies are validated without type coercion", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const adminEmail = `admin-no-coercion-${suffix}@test.need4deed.org`;
  let adminCookie: string;
  let person: Person;

  function patchPerson(payload: Record<string, unknown>) {
    return fastify.inject({
      method: "PATCH",
      url: `/person/${person.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload,
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    await fastify.db.userRepository.save(
      new User({
        email: adminEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: adminEmail, password: PASSWORD },
    });
    adminCookie = login.cookies.find((c) => c.name === accessCookieName)!.value;

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "No", lastName: `Coercion-${suffix}` }),
    );
  });

  afterAll(async () => {
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.userRepository.delete({ email: adminEmail });
    await fastify.close();
  });

  it("rejects null on a non-nullable string instead of storing an empty string", async () => {
    const res = await patchPerson({ lastName: null });
    expect(res.statusCode).toBe(400);

    const reloaded = await fastify.db.personRepository.findOneByOrFail({
      id: person.id,
    });
    expect(reloaded.lastName).toBe(`Coercion-${suffix}`);
  });

  it("rejects a number sent for a string field", async () => {
    const res = await patchPerson({ phone: 4915100000005 });
    expect(res.statusCode).toBe(400);
  });

  it("answers 400, not 500, when a value matches no anyOf branch", async () => {
    const res = await patchPerson({ email: {} });
    expect(res.statusCode).toBe(400);
  });

  it("still coerces path params", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/person/${person.id}`,
      cookies: { [accessCookieName]: adminCookie },
    });
    expect(res.statusCode).toBe(200);
  });
  it("still coerces querystring values", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/volunteer?page=1&limit=5",
      cookies: { [accessCookieName]: adminCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});
