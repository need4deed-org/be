import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName, refreshCookieName } from "../../../config/constants";
import { TEST_EMAILS } from "../../../data/seeds/fixtures/test";
import { createTestApp, getCookie } from "../helpers/app";

describe("smoke: auth flow", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/login", () => {
    it("rejects invalid credentials with 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAILS.admin, password: "wrong_password" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("accepts valid admin credentials and sets httpOnly cookies", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAILS.admin, password: "test_password" },
      });
      expect(res.statusCode).toBe(200);

      const access = getCookie(res.cookies, accessCookieName);
      const refresh = getCookie(res.cookies, refreshCookieName);
      expect(access).toBeDefined();
      expect(refresh).toBeDefined();

      const accessCookieMeta = res.cookies.find(
        (c) => c.name === accessCookieName,
      );
      expect(accessCookieMeta?.httpOnly).toBe(true);
    });
  });

  describe("GET /user/me", () => {
    it("returns 401 without auth cookie", async () => {
      const res = await app.inject({ method: "GET", url: "/user/me" });
      expect(res.statusCode).toBe(401);
    });

    it("returns current user data with valid access cookie", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAILS.admin, password: "test_password" },
      });
      const accessToken = getCookie(loginRes.cookies, accessCookieName);

      const res = await app.inject({
        method: "GET",
        url: "/user/me",
        cookies: { [accessCookieName]: accessToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.email).toBe(TEST_EMAILS.admin);
    });
  });

  describe("role enforcement", () => {
    it("coordinator can hit /user/me", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: TEST_EMAILS.coordinator,
          password: "test_password",
        },
      });
      const accessToken = getCookie(loginRes.cookies, accessCookieName);

      const res = await app.inject({
        method: "GET",
        url: "/user/me",
        cookies: { [accessCookieName]: accessToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.email).toBe(TEST_EMAILS.coordinator);
    });
  });
});
