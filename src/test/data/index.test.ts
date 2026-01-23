import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer as createTestServer } from "../../server";

describe("TypeORM Sanity Check", () => {
  let fastify: FastifyInstance;
  beforeAll(async () => {
    fastify = await createTestServer();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("should have an initialized database connection", async () => {
    const isDbReady = fastify.hasDecorator("db") || fastify.hasDecorator("orm");
    expect(isDbReady).toBe(true);
  });

  it("should be able to perform a basic count query", async () => {
    const userRepository = fastify.db.userRepository;
    const count = await userRepository.count();

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
