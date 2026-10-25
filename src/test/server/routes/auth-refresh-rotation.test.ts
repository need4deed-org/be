import { randomUUID } from "node:crypto";
import { FastifyInstance, LightMyRequestResponse } from "fastify";
import { UserRole } from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  accessCookieName,
  REFRESH_GRACE_MS,
  REFRESH_LIFESPAN_MS,
  refreshCookieName,
} from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import RefreshSession from "../../../data/entity/refresh-session.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { createServer } from "../../../server";
import {
  createRefreshSession,
  decideRotation,
  deleteExpiredRefreshSessions,
  rotateRefreshSession,
} from "../../../server/utils/data/refresh-session";
import { signRefreshToken } from "../../../server/utils/data/sign-refresh-token";

describe("refresh-token rotation", () => {
  let fastify: FastifyInstance;
  let user: User;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `refresh-rotation-${suffix}@example.com`;
  const password = "rotation_password";

  type RefreshClaims = { id: number; sid: string; jti: string };
  const claims = (token: string) => fastify.jwt.decode(token) as RefreshClaims;
  const manager = () => fastify.db.refreshSessionRepository.manager;
  const session = (sid: string) =>
    fastify.db.refreshSessionRepository.findOneByOrFail({ id: sid });

  async function login(): Promise<string> {
    return signRefreshToken(
      fastify,
      user,
      await createRefreshSession(manager(), user.id),
    );
  }

  async function rotateTwice(token: string) {
    const first = await rotateRefreshSession(manager(), user.id, claims(token));
    if (first.kind !== "rotated") {
      throw new Error("expected a rotation");
    }
    return rotateRefreshSession(manager(), user.id, first.ids);
  }

  const refresh = (token: string) =>
    fastify.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refresh: token },
    });

  function expectAuthCookiesCleared(response: LightMyRequestResponse) {
    for (const name of [accessCookieName, refreshCookieName]) {
      const cookie = response.cookies.find((c) => c.name === name);
      expect(cookie?.value, `expected ${name} to be cleared`).toBe("");
    }
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(password),
        role: UserRole.VOLUNTEER,
        isActive: true,
        person: new Person({ firstName: "Refresh", lastName: "User", email }),
      }),
    );
  });

  beforeEach(async () => {
    await fastify.db.refreshSessionRepository.delete({ userId: user.id });
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ email });
    await fastify.db.personRepository.delete({ email });
    await fastify.close();
  });

  it("login opens a session the refresh token points at", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(response.statusCode).toBe(200);
    const token = response.json().data.refresh;
    const { id, sid, jti } = claims(token);

    expect(id).toBe(user.id);
    const row = await session(sid);
    expect(row.userId).toBe(user.id);
    expect(row.currentJti).toBe(jti);
    expect(row.revokedAt).toBeNull();
  });

  it("login revokes the session of the refresh cookie it replaces", async () => {
    const previous = await login();
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
      cookies: { [refreshCookieName]: previous },
    });

    expect(response.statusCode).toBe(200);
    expect((await session(claims(previous).sid)).revokedAt).not.toBeNull();
    const fresh = response.json().data.refresh;
    expect((await session(claims(fresh).sid)).revokedAt).toBeNull();
  });

  it("rotates to a new jti in the same session and renews the cookie", async () => {
    const token = await login();
    const response = await refresh(token);

    expect(response.statusCode).toBe(200);
    const { access, refresh: next } = response.json();
    expect(fastify.jwt.decode(access)).toMatchObject({
      id: user.id,
      type: "access",
    });
    expect(claims(next).sid).toBe(claims(token).sid);
    expect(claims(next).jti).not.toBe(claims(token).jti);
    expect(
      response.cookies.find(({ name }) => name === refreshCookieName)?.value,
    ).toBe(next);

    const row = await session(claims(token).sid);
    expect(row.currentJti).toBe(claims(next).jti);
    expect(row.previousJti).toBe(claims(token).jti);
  });

  it("revokes the session when a token two rotations old is replayed", async () => {
    const token = await login();
    const { sid } = claims(token);
    const rotated = await rotateTwice(token);

    expect(
      await rotateRefreshSession(manager(), user.id, claims(token)),
    ).toEqual({ kind: "reuse" });
    expect((await session(sid)).revokedAt).not.toBeNull();

    if (rotated.kind !== "rotated") {
      throw new Error("expected a rotation");
    }
    const response = await refresh(
      fastify.jwt.sign({
        id: user.id,
        email,
        role: UserRole.VOLUNTEER,
        type: "refresh",
        ...rotated.ids,
      }),
    );
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "BadRequestError",
      message: "Invalid refresh token.",
    });
  });

  it("rejects a replayed token over HTTP with the unchanged 400", async () => {
    const token = await login();
    await rotateTwice(token);

    const response = await refresh(token);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "BadRequestError",
      message: "Invalid refresh token.",
    });
    expect((await session(claims(token).sid)).revokedAt).not.toBeNull();
    expectAuthCookiesCleared(response);
  });

  it("answers the previous jti within the grace window with the current jti", async () => {
    const token = await login();
    const rotated = await rotateRefreshSession(
      manager(),
      user.id,
      claims(token),
    );
    if (rotated.kind !== "rotated") {
      throw new Error("expected a rotation");
    }

    const soon = new Date(Date.now() + REFRESH_GRACE_MS - 1000);
    expect(
      await rotateRefreshSession(manager(), user.id, claims(token), soon),
    ).toEqual({ kind: "grace", ids: rotated.ids, rotatedAt: expect.any(Date) });
    expect((await session(claims(token).sid)).revokedAt).toBeNull();
  });

  it("revokes the session when the previous jti comes after the grace window", async () => {
    const token = await login();
    await rotateRefreshSession(manager(), user.id, claims(token));

    const later = new Date(Date.now() + REFRESH_GRACE_MS + 1000);
    expect(
      await rotateRefreshSession(manager(), user.id, claims(token), later),
    ).toEqual({ kind: "reuse" });
    expect((await session(claims(token).sid)).revokedAt).not.toBeNull();
  });

  it("recovers a client that lost the rotated cookie hours ago over HTTP", async () => {
    const token = await login();
    const lost = await refresh(token);
    expect(lost.statusCode).toBe(200);
    await fastify.db.refreshSessionRepository.update(
      { id: claims(token).sid },
      { rotatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    );

    const info = vi.spyOn(logger, "info");
    const response = await refresh(token);
    const logged = info.mock.calls.flat().map(String);
    info.mockRestore();

    expect(response.statusCode).toBe(200);
    expect(claims(response.json().refresh).jti).toBe(
      claims(lost.json().refresh).jti,
    );
    expect((await session(claims(token).sid)).revokedAt).toBeNull();
    expect(logged).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `^Refresh grace for user ${user.id}, session ${claims(token).sid}, 2880\\ds after rotation$`,
        ),
      ),
    );
  });

  it("serves concurrent refreshes of one token without revoking", async () => {
    const token = await login();
    const responses = await Promise.all([
      refresh(token),
      refresh(token),
      refresh(token),
    ]);

    expect(responses.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    const jtis = new Set(responses.map((r) => claims(r.json().refresh).jti));
    expect(jtis.size).toBe(1);
    const row = await session(claims(token).sid);
    expect(row.revokedAt).toBeNull();
    expect(jtis.has(row.currentJti)).toBe(true);
  });

  it("keeps sessions of different logins independent", async () => {
    const laptop = await login();
    const phone = await login();
    expect(claims(laptop).sid).not.toBe(claims(phone).sid);

    await rotateTwice(laptop);
    await rotateRefreshSession(manager(), user.id, claims(laptop));
    expect((await session(claims(laptop).sid)).revokedAt).not.toBeNull();

    expect((await refresh(phone)).statusCode).toBe(200);
  });

  it("leaves the session untouched when the user is inactive", async () => {
    const token = await login();
    await fastify.db.userRepository.update(
      { id: user.id },
      { isActive: false },
    );
    try {
      const response = await refresh(token);
      expect(response.statusCode).toBe(403);
      expectAuthCookiesCleared(response);
    } finally {
      await fastify.db.userRepository.update(
        { id: user.id },
        { isActive: true },
      );
    }
    const row = await session(claims(token).sid);
    expect(row.currentJti).toBe(claims(token).jti);
    expect(row.previousJti).toBeNull();
  });

  it("rejects a pre-rotation token without sid/jti", async () => {
    const legacy = fastify.jwt.sign(
      { id: user.id, email, role: UserRole.VOLUNTEER, type: "refresh" } as any,
      { expiresIn: `${REFRESH_LIFESPAN_MS}` },
    );

    const response = await refresh(legacy);
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe("Invalid refresh token.");
    expectAuthCookiesCleared(response);
  });

  it("rejects a token naming another user's session", async () => {
    const token = await login();
    expect(
      await rotateRefreshSession(manager(), user.id + 1, claims(token)),
    ).toEqual({ kind: "invalid" });
    expect((await session(claims(token).sid)).revokedAt).toBeNull();
  });

  it("logout revokes the session of its refresh cookie", async () => {
    const token = await login();
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { [refreshCookieName]: token },
    });

    expect(response.statusCode).toBe(200);
    expect((await session(claims(token).sid)).revokedAt).not.toBeNull();
    expect((await refresh(token)).statusCode).toBe(400);
  });

  it("password reset revokes all of the user's sessions", async () => {
    const tokens = [await login(), await login()];
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: {
        token: fastify.jwt.sign({ id: user.id, email, type: "reset" }),
        newPassword: password,
      },
    });

    expect(response.statusCode).toBe(200);
    for (const token of tokens) {
      expect((await session(claims(token).sid)).revokedAt).not.toBeNull();
    }
  });

  it("password change revokes all sessions but the caller's", async () => {
    const own = await login();
    const other = await login();
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      cookies: {
        access: fastify.jwt.sign({
          id: user.id,
          email,
          role: UserRole.VOLUNTEER,
          type: "access",
        }),
        [refreshCookieName]: own,
      },
      payload: { password, newPassword: password },
    });

    expect(response.statusCode).toBe(200);
    expect((await session(claims(own).sid)).revokedAt).toBeNull();
    expect((await session(claims(other).sid)).revokedAt).not.toBeNull();
  });
});

describe("deleteExpiredRefreshSessions", () => {
  it("deletes expired sessions, keeping live and revoked ones", async () => {
    const fastify = await createServer();
    await fastify.ready();
    const manager = fastify.db.refreshSessionRepository.manager;
    const email = `refresh-prune-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    try {
      const user = await fastify.db.userRepository.save(
        new User({
          email,
          password: await hashPassword("prune_password"),
          role: UserRole.VOLUNTEER,
          isActive: true,
          person: new Person({ firstName: "Prune", lastName: "User", email }),
        }),
      );
      const live = await createRefreshSession(manager, user.id);
      const expired = await createRefreshSession(
        manager,
        user.id,
        new Date(Date.now() - REFRESH_LIFESPAN_MS - 1000),
      );
      const revoked = await fastify.db.refreshSessionRepository.save(
        new RefreshSession({
          id: randomUUID(),
          userId: user.id,
          currentJti: randomUUID(),
          expiresAt: new Date(Date.now() + REFRESH_LIFESPAN_MS),
          revokedAt: new Date(),
        }),
      );

      expect(
        await deleteExpiredRefreshSessions(manager),
      ).toBeGreaterThanOrEqual(1);

      const left = await fastify.db.refreshSessionRepository.findBy({
        userId: user.id,
      });
      expect(left.map((r) => r.id).sort()).toEqual(
        [live.sid, revoked.id].sort(),
      );
      expect(left.map((r) => r.id)).not.toContain(expired.sid);
    } finally {
      await fastify.db.userRepository.delete({ email });
      await fastify.db.personRepository.delete({ email });
      await fastify.close();
    }
  });
});

describe("decideRotation", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const live: Pick<
    RefreshSession,
    | "userId"
    | "currentJti"
    | "previousJti"
    | "rotatedAt"
    | "expiresAt"
    | "revokedAt"
  > = {
    userId: 1,
    currentJti: "current",
    previousJti: "previous",
    rotatedAt: new Date(now.getTime() - 1000),
    expiresAt: new Date(now.getTime() + 1000),
    revokedAt: null,
  };

  it("rotates the current jti", () => {
    expect(decideRotation(live, 1, "current", now)).toEqual({
      kind: "rotate",
    });
  });

  it("allows the previous jti only within the grace window", () => {
    const edge = {
      ...live,
      rotatedAt: new Date(now.getTime() - REFRESH_GRACE_MS),
    };
    expect(decideRotation(edge, 1, "previous", now)).toEqual({
      kind: "grace",
    });
    const stale = {
      ...live,
      rotatedAt: new Date(now.getTime() - REFRESH_GRACE_MS - 1),
    };
    expect(decideRotation(stale, 1, "previous", now)).toEqual({
      kind: "reuse",
    });
  });

  it("treats any other jti as reuse", () => {
    expect(decideRotation(live, 1, "older", now)).toEqual({ kind: "reuse" });
  });

  it("rejects a missing, foreign, revoked or expired session", () => {
    expect(decideRotation(null, 1, "current", now).kind).toBe("invalid");
    expect(decideRotation(live, 2, "current", now).kind).toBe("invalid");
    expect(
      decideRotation({ ...live, revokedAt: now }, 1, "current", now).kind,
    ).toBe("invalid");
    expect(
      decideRotation({ ...live, expiresAt: now }, 1, "current", now).kind,
    ).toBe("invalid");
  });
});
