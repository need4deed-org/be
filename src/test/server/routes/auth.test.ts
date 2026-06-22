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
