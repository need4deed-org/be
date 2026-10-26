import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../../server";

describe("GET /district-geometry", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    if (fastify) {
      await fastify.close();
    }
  });

  it("returns each district geometry with its database id", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/district-geometry",
    });

    expect(response.statusCode, response.body).toBe(200);
    const { data } = response.json();
    expect(data.features).toHaveLength(12);
    expect(
      data.features.every((feature: { properties: { districtId: number } }) =>
        Number.isInteger(feature.properties.districtId),
      ),
    ).toBe(true);
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
  });
});
