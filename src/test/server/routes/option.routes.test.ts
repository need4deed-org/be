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

  it.each([EntityTableName.CATEGORY, "not-a-table"])(
    "rejects %s, which isn't an option list, with 400",
    async (list) => {
      const response = await fastify.inject({
        method: "GET",
        url: `/option/${list}`,
      });

      expect(response.statusCode).toBe(400);
    },
  );

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
