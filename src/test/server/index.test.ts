import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer as createTestServer } from "../../server";

describe("Fastify sanity check", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createTestServer();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("should create the server without errors", async () => {
    await fastify.ready();

    const health = { message: "Need4Deed API v1 is up and running." };
    const response = await fastify.inject({
      method: "GET",
      url: "/health-check",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(health);
  });
});
