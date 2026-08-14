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
import ApiKey from "../../../data/entity/api-key.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { createServer } from "../../../server";

// Exercises the X-API-Key path added to authenticate() in
// src/server/plugins/jwt.ts, against the existing COORDINATOR-only
// GET /trusted-domain route (be#875).
describe("X-API-Key authentication", () => {
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

  const coordinatorUser = {
    id: 42,
    role: UserRole.COORDINATOR,
    isActive: true,
  };

  it("authenticates a coordinator-scoped route with a valid key and records lastUsedAt", async () => {
    const rawKey = "n4d_test-raw-key";
    const keyHash = await hashPassword(rawKey);

    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([
      new ApiKey({
        id: 1,
        keyHash,
        revokedAt: null,
        userId: 42,
        user: coordinatorUser as any,
      }),
    ]);
    const updateSpy = vi
      .spyOn(fastify.db.apiKeyRepository, "update")
      .mockResolvedValue({} as any);
    vi.spyOn(fastify.db.trustedDomainRepository, "find").mockResolvedValue([]);

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(1, { lastUsedAt: expect.any(Date) });
  });

  it("rejects an unknown key with 401 and does not fall back to cookie auth", async () => {
    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([]);

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": "not-a-real-key" },
      // A valid cookie is deliberately absent-equivalent here: presence of
      // the header must not trigger a fallback to jwtVerify().
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Invalid API key.");
  });

  it("rejects a revoked key (excluded by the repository's revokedAt filter)", async () => {
    // authenticate() only ever sees non-revoked rows (find() is called with
    // where: { revokedAt: IsNull() }), so a revoked key looks identical to
    // an unknown one from the mock's perspective.
    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([]);

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": "n4d_revoked-key" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Invalid API key.");
  });

  it("rejects a valid key whose service user has been deactivated", async () => {
    const rawKey = "n4d_inactive-user-key";
    const keyHash = await hashPassword(rawKey);

    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([
      new ApiKey({
        id: 2,
        keyHash,
        revokedAt: null,
        userId: 42,
        user: { ...coordinatorUser, isActive: false } as any,
      }),
    ]);
    vi.spyOn(fastify.db.apiKeyRepository, "update").mockResolvedValue(
      {} as any,
    );

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Account is not active.");
  });

  it("still enforces the route's role check for a key whose user lacks it", async () => {
    const rawKey = "n4d_volunteer-role-key";
    const keyHash = await hashPassword(rawKey);

    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([
      new ApiKey({
        id: 3,
        keyHash,
        revokedAt: null,
        userId: 7,
        user: { id: 7, role: UserRole.VOLUNTEER, isActive: true } as any,
      }),
    ]);
    vi.spyOn(fastify.db.apiKeyRepository, "update").mockResolvedValue(
      {} as any,
    );

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": rawKey },
    });

    expect(response.statusCode).toBe(403);
  });

  it("never logs the raw API key value", async () => {
    const rawKey = "n4d_should-never-appear-in-logs";
    vi.spyOn(fastify.db.apiKeyRepository, "find").mockResolvedValue([]);
    const debugSpy = vi.spyOn(logger, "debug");
    const errorSpy = vi.spyOn(logger, "error");

    await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      headers: { "x-api-key": rawKey },
    });

    for (const call of [...debugSpy.mock.calls, ...errorSpy.mock.calls]) {
      expect(JSON.stringify(call)).not.toContain(rawKey);
    }
  });

  it("leaves the existing JWT-cookie flow unaffected when no header is sent", async () => {
    vi.spyOn(fastify.db.userRepository, "findOne").mockResolvedValue(
      coordinatorUser as any,
    );
    vi.spyOn(fastify.db.trustedDomainRepository, "find").mockResolvedValue([]);
    const apiKeyFindSpy = vi.spyOn(fastify.db.apiKeyRepository, "find");

    const accessToken = fastify.jwt.sign({
      id: 42,
      email: "coordinator@example.com",
    });

    const response = await fastify.inject({
      method: "GET",
      url: "/trusted-domain",
      cookies: { access: accessToken },
    });

    expect(response.statusCode).toBe(200);
    expect(apiKeyFindSpy).not.toHaveBeenCalled();
  });
});
