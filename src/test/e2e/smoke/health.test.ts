import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app";

describe("smoke: health check", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health-check returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health-check" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      message: expect.stringContaining("up and running"),
    });
  });
});
