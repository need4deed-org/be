import { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../data", () => ({
  initDatabase: vi.fn(async () => {}),
}));

vi.mock("../../data/data-source", () => ({
  dataSource: {
    isInitialized: true,
    initialize: vi.fn(async () => {}),
    destroy: vi.fn(async () => {}),
    getRepository: vi.fn(() => ({})),
    createQueryRunner: vi.fn(() => ({})),
    query: vi.fn(async () => []),
    runMigrations: vi.fn(async () => []),
  },
}));

async function buildServer(nodeEnv: string): Promise<FastifyInstance> {
  process.env.NODE_ENV = nodeEnv;
  process.env.JWT_SECRET =
    nodeEnv === "production" ? "x".repeat(64) : "test-secret-only-for-vitest";

  vi.resetModules();
  const { createServer } = await import("../../server");
  return createServer();
}

afterEach(() => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-only-for-vitest";
});

describe("swagger endpoint is restricted to non-production", () => {
  it("serves the swagger UI and spec when not in production", async () => {
    const fastify = await buildServer("development");

    try {
      const ui = await fastify.inject({ method: "GET", url: "/swagger" });
      expect(ui.statusCode).toBe(200);
      expect(ui.headers["content-type"]).toContain("text/html");

      const spec = await fastify.inject({
        method: "GET",
        url: "/swagger/json",
      });
      expect(spec.statusCode).toBe(200);
      expect(spec.json()).toMatchObject({
        info: { title: "N4D Fastify API Documentation" },
      });
    } finally {
      await fastify.close();
    }
  });

  it("does not register swagger endpoints in production", async () => {
    const fastify = await buildServer("production");

    try {
      const ui = await fastify.inject({ method: "GET", url: "/swagger" });
      expect(ui.statusCode).toBe(404);

      const spec = await fastify.inject({
        method: "GET",
        url: "/swagger/json",
      });
      expect(spec.statusCode).toBe(404);

      const yaml = await fastify.inject({
        method: "GET",
        url: "/swagger/yaml",
      });
      expect(yaml.statusCode).toBe(404);
    } finally {
      await fastify.close();
    }
  });
});
