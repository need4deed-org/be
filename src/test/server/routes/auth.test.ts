import { FastifyInstance } from "fastify";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { accessCookieName, refreshCookieName } from "../../../config/constants";
import { createServer } from "../../../server";

vi.mock("../../../data/utils", async () => {
  const actual = await vi.importActual("../../../data/utils");
  return {
    ...actual,
    hashPassword: vi
      .fn()
      .mockImplementation((password: string) =>
        Promise.resolve("hashed-password-" + password),
      ),
  };
});

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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("resets password with a valid reset token", async () => {
    const resetToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      type: "reset",
    });

    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
    } as any);
    const updateSpy = vi
      .spyOn(fastify.db.userRepository, "update")
      .mockResolvedValue({} as any);

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: resetToken, newPassword: "newpass123456" },
    });

    expect(updateSpy).toHaveBeenCalledWith(
      { id: 999 },
      { password: "hashed-password-newpass123456" },
    );
    expect(response.statusCode).toBe(200);
  });

  it("resets password via cookie when password matches", async () => {
    const accessToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      type: "access",
    });

    const checkPassword = vi.fn().mockResolvedValue(true);
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
      checkPassword,
    } as any);
    const updateSpy = vi
      .spyOn(fastify.db.userRepository, "update")
      .mockResolvedValue({} as any);

    const currentPass = "currentpass123";
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      cookies: { access: accessToken },
      payload: { password: currentPass, newPassword: "newpass123456" },
    });

    expect(checkPassword).toHaveBeenCalledWith(currentPass);
    expect(updateSpy).toHaveBeenCalledWith(
      { id: 999 },
      { password: "hashed-password-newpass123456" },
    );
    expect(response.statusCode).toBe(200);
  });
});

describe("POST /auth/request-reset", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends reset email when user exists and is active", async () => {
    const mockUser = { id: 1, email: "test@example.com", isActive: true };
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue(
      mockUser as any,
    );

    const passwordResetSpy = vi.fn().mockResolvedValue(undefined);
    fastify.notify.passwordReset = passwordResetSpy;

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/request-reset",
      payload: { email: "test@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(passwordResetSpy).toHaveBeenCalledWith(mockUser);
  });

  it("does not send email when user is inactive", async () => {
    const mockUser = { id: 1, email: "test@example.com", isActive: false };
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue(
      mockUser as any,
    );

    const passwordResetSpy = vi.fn().mockResolvedValue(undefined);
    fastify.notify.passwordReset = passwordResetSpy;

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/request-reset",
      payload: { email: "test@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(passwordResetSpy).not.toHaveBeenCalled();
  });

  it("does not send email when user does not exist", async () => {
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue(null);

    const passwordResetSpy = vi.fn().mockResolvedValue(undefined);
    fastify.notify.passwordReset = passwordResetSpy;

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/request-reset",
      payload: { email: "test@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(passwordResetSpy).not.toHaveBeenCalled();
  });
});
