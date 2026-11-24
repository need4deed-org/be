import { FastifyInstance } from "fastify";
import { EntityTableName, Lang } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../../server";

describe("GET /option", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("returns every option list except category (be#1076)", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/option?language=${Lang.EN}`,
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(Object.keys(data).sort()).toEqual(
      [
        EntityTableName.ACTIVITY,
        EntityTableName.AGENT_TYPE,
        EntityTableName.DISTRICT,
        EntityTableName.LANGUAGE,
        EntityTableName.LEAD,
        EntityTableName.SERVICE,
        EntityTableName.SKILL,
      ].sort(),
    );
    expect(data[EntityTableName.SKILL].length).toBeGreaterThan(0);
  });

  it("returns an empty body for a table that isn't an option list", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/option/${EntityTableName.CATEGORY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({});
  });

  it("returns only the requested list", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: `/option/${EntityTableName.SKILL}?language=${Lang.DE}`,
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(Object.keys(data)).toEqual([EntityTableName.SKILL]);
    expect(data[EntityTableName.SKILL].length).toBeGreaterThan(0);
  });
});
