import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import { createApiKey } from "../../../data/scripts/create-api-key";
import { parseArgs, revokeApiKey } from "../../../data/scripts/revoke-api-key";
import { createServer } from "../../../server";

describe("revoke-api-key parseArgs", () => {
  it("requires --label", () => {
    expect(() => parseArgs([])).toThrow(/Usage/);
  });

  it("parses --label", () => {
    expect(parseArgs(["--label", "bot"])).toEqual({ label: "bot" });
  });
});

describe("revokeApiKey", () => {
  let fastify: FastifyInstance;
  const labelsToClean: string[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const label of labelsToClean) {
      const key = await fastify.db.apiKeyRepository.findOne({
        where: { label },
      });
      if (!key) {
        continue;
      }
      await fastify.db.apiKeyRepository.delete({ id: key.id });
      await fastify.db.userRepository.delete({ id: key.userId });
    }
    await fastify.close();
  });

  it("throws for an unknown label", async () => {
    await expect(
      revokeApiKey(dataSource, { label: "no-such-label" }),
    ).rejects.toThrow(/No API key found/);
  });

  it("sets revokedAt on an active key", async () => {
    const label = `test-revoke-${Date.now()}`;
    labelsToClean.push(label);
    await createApiKey(dataSource, { label, role: UserRole.COORDINATOR });

    const result = await revokeApiKey(dataSource, { label });
    expect(result.alreadyRevoked).toBe(false);

    const apiKey = await fastify.db.apiKeyRepository.findOneByOrFail({
      label,
    });
    expect(apiKey.revokedAt).not.toBeNull();
  });

  it("reports alreadyRevoked without erroring on a second call", async () => {
    const label = `test-revoke-twice-${Date.now()}`;
    labelsToClean.push(label);
    await createApiKey(dataSource, { label, role: UserRole.COORDINATOR });

    await revokeApiKey(dataSource, { label });
    const secondCall = await revokeApiKey(dataSource, { label });

    expect(secondCall.alreadyRevoked).toBe(true);
  });
});
