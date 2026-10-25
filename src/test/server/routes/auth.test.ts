import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
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
import User from "../../../data/entity/user.entity";
import { createServer } from "../../../server";

vi.mock("../../../data", async () => {
  const actual = await vi.importActual("../../../data");
  return {
    ...actual,
    initDatabase: vi.fn().mockImplementation(() => Promise.resolve()),
  };
});

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

function mockTransaction(fastify: FastifyInstance) {
  const update = vi.fn().mockResolvedValue({});
  vi.spyOn(fastify.db.userRepository.manager, "transaction").mockImplementation(
    (async (run: (tx: unknown) => Promise<unknown>) => run({ update })) as any,
  );
  return update;
}

describe("POST /auth/logout", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("still logs out when revoking the session fails", async () => {
    vi.spyOn(
      fastify.db.refreshSessionRepository.manager,
      "update",
    ).mockRejectedValue(new Error("db down"));
    const refresh = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      role: UserRole.VOLUNTEER,
      type: "refresh",
      sid: "sid",
      jti: "jti",
    });

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { [refreshCookieName]: refresh },
    });

    expect(response.statusCode).toBe(200);
    vi.restoreAllMocks();
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
      role: UserRole.VOLUNTEER,
      type: "access",
    });

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: nonResetToken, newPassword: "newpass123456" },
    });

    // Since 400 can also be returned for other reasons, check message
    expect(response.json()).toEqual({
      message: "Invalid reset token.",
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

    // Since 400 can also be returned for other reasons, check message
    expect(response.json()).toEqual({
      message: "Invalid reset token.",
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects an invalid token", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: "not-a-valid-jwt", newPassword: "newpass123456" },
    });

    // Since 400 can also be returned for other reasons, check message
    expect(response.json()).toEqual({
      message: "Invalid reset token.",
    });
    expect(response.statusCode).toBe(400);
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
    const updateSpy = mockTransaction(fastify);

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: resetToken, newPassword: "newpass123456" },
    });

    expect(updateSpy).toHaveBeenCalledWith(
      User,
      { id: 999 },
      { password: "hashed-password-newpass123456" },
    );
    expect(response.statusCode).toBe(200);
  });
});

describe("POST /auth/password-change", () => {
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

  it("returns 401 when not authenticated", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      payload: { password: "currentpass123", newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when current password is incorrect", async () => {
    const accessToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      role: UserRole.VOLUNTEER,
      type: "access",
    });

    const checkPassword = vi.fn().mockResolvedValue(false);
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
      isActive: true,
      checkPassword,
    } as any);

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      cookies: { access: accessToken },
      payload: { password: "wrongpass", newPassword: "newpass123456" },
    });

    // Since 400 can also be returned for other reasons, check message
    expect(response.json()).toEqual({
      message: "Current password is incorrect.",
    });
    expect(response.statusCode).toBe(400);
  });

  it("changes password when current password matches", async () => {
    const accessToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      role: UserRole.VOLUNTEER,
      type: "access",
    });

    const checkPassword = vi.fn().mockResolvedValue(true);
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
      isActive: true,
      checkPassword,
    } as any);
    const updateSpy = mockTransaction(fastify);

    const currentPass = "currentpass123";
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      cookies: { access: accessToken },
      payload: { password: currentPass, newPassword: "newpass123456" },
    });

    expect(checkPassword).toHaveBeenCalledWith(currentPass);
    expect(updateSpy).toHaveBeenCalledWith(
      User,
      { id: 999 },
      { password: "hashed-password-newpass123456" },
    );
    expect(response.statusCode).toBe(200);
  });
});

describe("POST /auth/refresh", () => {
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

  it("rejects a non-refresh token (e.g. a verify or access token)", async () => {
    const findOneSpy = vi.spyOn(fastify.db.userRepository, "findOne");

    for (const type of ["verify", "reset", "access"]) {
      const token = fastify.jwt.sign(
        type === "access"
          ? {
              id: 999,
              email: "test@example.com",
              role: UserRole.COORDINATOR,
              type: "access" as const,
            }
          : {
              id: 999,
              email: "test@example.com",
              type: type as "verify" | "reset",
            },
      );

      const response = await fastify.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refresh: token },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: "BadRequestError",
        message: "Invalid refresh token.",
      });
    }

    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("requires a refresh token", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "BadRequestError",
      message: "Refresh token is required.",
    });
  });

  it("rejects a malformed refresh token", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh: "not-a-jwt" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "BadRequestError",
      message: "Invalid refresh token.",
    });
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

describe("Rate limiting", () => {
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

  it("POST /auth/login limits to 10 requests per minute", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "whatever" },
      });
      expect(response.statusCode).not.toBe(429);
    }

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com", password: "whatever" },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });

  it("POST /auth/login counts per account, ignoring case, not per IP", async () => {
    const login = (email: string) =>
      fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: "whatever" },
      });

    expect((await login("TEST@example.com")).statusCode).toBe(429);
    expect((await login("other@example.com")).statusCode).not.toBe(429);
  });

  it("POST /auth/refresh limits to 20 requests per minute", async () => {
    for (let i = 0; i < 20; i++) {
      const response = await fastify.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refresh: "some-token" },
      });
      expect(response.statusCode).not.toBe(429);
    }

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh: "some-token" },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });

  it("POST /auth/request-reset limits to 3 requests per 5 minutes", async () => {
    for (let i = 0; i < 3; i++) {
      const response = await fastify.inject({
        method: "POST",
        url: "/auth/request-reset",
        payload: { email: "test@example.com" },
      });
      expect(response.statusCode).not.toBe(429);
    }

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/request-reset",
      payload: { email: "test@example.com" },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });

  it("POST /auth/password-reset limits to 10 requests per minute", async () => {
    for (let i = 0; i < 10; i++) {
      const response = await fastify.inject({
        method: "POST",
        url: "/auth/password-reset",
        payload: { token: "invalid", newPassword: "newpass123456" },
      });
      expect(response.statusCode).not.toBe(429);
    }

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token: "invalid", newPassword: "newpass123456" },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });

  it("POST /auth/password-change limits to 20 requests per minute", async () => {
    const accessToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      role: UserRole.VOLUNTEER,
      type: "access",
    });

    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
      role: "volunteer",
      isActive: true,
    } as any);

    for (let i = 0; i < 20; i++) {
      const response = await fastify.inject({
        method: "POST",
        url: "/auth/password-change",
        cookies: { access: accessToken },
        payload: { password: "old", newPassword: "new" },
      });
      expect(response.statusCode).not.toBe(429);
    }

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      cookies: { access: accessToken },
      payload: { password: "old", newPassword: "new" },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });
});

describe("Login per-IP cap", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("POST /auth/login limits one IP to 30 requests per minute across accounts", async () => {
    const login = (i: number) =>
      fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: `spray-${i}@example.com`, password: "whatever" },
      });

    for (let i = 0; i < 30; i++) {
      expect((await login(i)).statusCode).not.toBe(429);
    }
    const response = await login(30);
    expect(response.statusCode).toBe(429);
    expect(response.json().message).toBe("Rate limit exceeded");
  });
});
