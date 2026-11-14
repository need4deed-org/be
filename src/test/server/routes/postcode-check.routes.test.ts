import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import { createServer } from "../../../server";
import { randomNonReferencePostcode } from "../../random";

describe("GET /postcode/check", () => {
  let fastify: FastifyInstance;
  const onDemandValue = randomNonReferencePostcode("1");
  let createdOnDemandId: number | undefined;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    if (createdOnDemandId) {
      await dataSource.getRepository(Postcode).delete(createdOnDemandId);
    }
    if (fastify) {
      await fastify.close();
    }
  });

  const check = (code: string) =>
    fastify.inject({
      method: "GET",
      url: `/postcode/check?code=${encodeURIComponent(code)}`,
    });

  it("knows a PLZ from the reference list", async () => {
    const response = await check("10969");

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toEqual({ code: "10969", known: true });
  });

  it("doesn't know a PLZ that only exists as a row created on demand", async () => {
    const { raw } = await dataSource
      .getRepository(Postcode)
      .createQueryBuilder()
      .insert()
      .values({ value: onDemandValue })
      .orIgnore()
      .returning("id")
      .execute();
    createdOnDemandId = raw[0]?.id;

    const response = await check(onDemandValue);

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toEqual({ code: onDemandValue, known: false });
  });

  it("restores the leading zero of a 4-digit PLZ", async () => {
    const response = await check(" 1067 ");

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toEqual({ code: "01067", known: true });
  });

  it.each(["abc", "123", "123456", ""])(
    "rejects %j as not a PLZ",
    async (code) => {
      const response = await check(code);

      expect(response.statusCode, response.body).toBe(400);
    },
  );

  it("is public", async () => {
    const response = await check("10969");

    expect(response.statusCode).not.toBe(401);
  });
});
