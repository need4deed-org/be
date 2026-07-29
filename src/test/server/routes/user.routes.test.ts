import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import { createServer } from "../../../server";

// Regression coverage for two things landed together:
// 1. POST /user's AGENT email-domain gate rejects with InvalidOrganizationEmailError
//    (400), not the old bare NotFoundError (404, "Resource not found").
// 2. The `error` field (the thrown class's name) actually survives response
//    serialization — responseErrors previously only declared `message`, so
//    Fastify's schema-driven serializer silently stripped `error` from every
//    error response using it, regardless of what the error handler sent.
describe("POST /user — AGENT email-domain gate", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const trustedDomain = `trusted-${suffix}.example`;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain: trustedDomain }),
    );
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    await fastify.db.trustedDomainRepository.delete({ domain: trustedDomain });
    await fastify.close();
  });

  it("rejects an unrecognized/untrusted organization email domain with a distinguishable 400", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-${suffix}@totally-unknown-domain-${suffix}.example`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "InvalidOrganizationEmailError",
    });
    expect(typeof res.json().message).toBe("string");
  });

  it("allows AGENT registration when the email domain is on the trusted allowlist", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-${suffix}@${trustedDomain}`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
  });
});
