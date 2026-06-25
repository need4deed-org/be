import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName, refreshCookieName } from "../../../config/constants";
import { createServer } from "../../../server";

describe("POST /auth/logout", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("clears the access and refresh cookies without requiring auth", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/logout",
      // No auth cookie/token: logout must work for a stale/expired session.
      cookies: { [accessCookieName]: "stale", [refreshCookieName]: "stale" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Logout successful." });

    const cleared = Object.fromEntries(
      response.cookies.map((c) => [c.name, c]),
    );
    for (const name of [accessCookieName, refreshCookieName]) {
      const cookie = cleared[name];
      expect(cookie, `expected a Set-Cookie clearing ${name}`).toBeDefined();
      expect(cookie.value).toBe("");
      // Cleared cookies are expired (past date and/or maxAge 0).
      const expired =
        cookie.maxAge === 0 ||
        (cookie.expires instanceof Date &&
          cookie.expires.getTime() <= Date.now());
      expect(expired, `expected ${name} cookie to be expired`).toBe(true);
    }
  });
});

describe("POST /auth/reset-password", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("rejects a token of type 'access'", async () => {
    const nonResetToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      type: "access",
    });

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: nonResetToken, newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a token of type 'verify'", async () => {
    const nonResetToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      type: "verify",
    });

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: nonResetToken, newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("rejects an invalid token", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: "not-a-valid-jwt", newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 403 when no token and no auth cookie", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(403);
  });
});
