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
      checkPassword,
    } as any);
    const updateSpy = vi
      .spyOn(fastify.db.userRepository, "update")
      .mockResolvedValue({} as any);

    const currentPass = "currentpass123";
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
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

  it("issues a new access token carrying the user's role and type", async () => {
    const refreshToken = fastify.jwt.sign({
      id: 999,
      email: "test@example.com",
      role: UserRole.COORDINATOR,
      type: "refresh",
    });

    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue({
      id: 999,
      email: "test@example.com",
      role: UserRole.COORDINATOR,
      isActive: true,
    } as any);

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh: refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const { access } = response.json();
    const decoded = fastify.jwt.decode(access) as {
      id: number;
      email: string;
      role: string;
      type: string;
    };
    expect(decoded.role).toBe(UserRole.COORDINATOR);
    expect(decoded.type).toBe("access");
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
      expect(response.json()).toEqual({ message: "Invalid refresh token." });
    }

    expect(findOneSpy).not.toHaveBeenCalled();
  });

  // End-to-end regression for be#1023's actual reported symptom ("coordinator
  // posts list goes empty after tab refocus"): the two tests above only
  // assert the refreshed token *decodes* correctly — this chains it into a
  // real GET /post call to confirm the refreshed session still sees real
  // content, not the isPostManagerRole(role) => [] fallback a dropped role
  // claim used to trigger. Mocks userRepository.findOne (matching this
  // describe block's existing convention) and the post query chain, rather
  // than hitting a real DB — this file mocks initDatabase file-wide (see the
  // vi.mock("../../../data", ...) above), so no entity metadata is ever
  // registered here and a real repository.save() throws
  // EntityMetadataNotFoundError.
  it("a refreshed access token still authorizes GET /post for a COORDINATOR (be#1023 regression)", async () => {
    const coordinator = {
      id: 999,
      email: "refresh-regression@test.need4deed.org",
      role: UserRole.COORDINATOR,
      isActive: true,
    };
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue(
      coordinator as any,
    );

    const realPost = {
      id: 4242,
      text: "Refresh regression post",
      agentId: null,
      createdAt: new Date(),
      author: {
        id: coordinator.id,
        name: "Refresh Regression",
        avatarUrl: null,
      },
      taggedPersons: [],
      linkedOpportunities: [],
    };
    const queryBuilder: any = {
      leftJoinAndSelect: () => queryBuilder,
      loadRelationCountAndMap: () => queryBuilder,
      where: () => queryBuilder,
      orderBy: () => queryBuilder,
      addOrderBy: () => queryBuilder,
      skip: () => queryBuilder,
      take: () => queryBuilder,
      getManyAndCount: () => Promise.resolve([[realPost], 1]),
    };
    vi.spyOn(fastify.db.postRepository, "createQueryBuilder").mockReturnValue(
      queryBuilder,
    );

    // attachReactionData (called on every GET /post result, regardless of
    // requestPersonId) always runs its postReactionRepository count query.
    const reactionQueryBuilder: any = {
      select: () => reactionQueryBuilder,
      addSelect: () => reactionQueryBuilder,
      where: () => reactionQueryBuilder,
      groupBy: () => reactionQueryBuilder,
      addGroupBy: () => reactionQueryBuilder,
      getRawMany: () => Promise.resolve([]),
    };
    vi.spyOn(
      fastify.db.postReactionRepository,
      "createQueryBuilder",
    ).mockReturnValue(reactionQueryBuilder);

    const refreshToken = fastify.jwt.sign({
      id: coordinator.id,
      email: coordinator.email,
      role: UserRole.COORDINATOR,
      type: "refresh",
    });

    const refreshResponse = await fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh: refreshToken },
    });
    expect(refreshResponse.statusCode).toBe(200);
    const newAccessCookie = refreshResponse.cookies.find(
      (c) => c.name === accessCookieName,
    )?.value;
    expect(newAccessCookie).toBeTruthy();

    const postsResponse = await fastify.inject({
      method: "GET",
      url: "/post",
      cookies: { [accessCookieName]: newAccessCookie! },
    });

    expect(postsResponse.statusCode).toBe(200);
    const { data, count } = postsResponse.json();
    expect(count).toBe(1);
    expect(data.some((p: { id: number }) => p.id === realPost.id)).toBe(true);
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
