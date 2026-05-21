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

  it("should have entity metadata registered for all core entities", () => {
    const ds = fastify.db.userRepository.manager.connection;
    const entityNames = ds.entityMetadatas.map((m) => m.name);
    expect(entityNames).toContain("User");
    expect(entityNames).toContain("Volunteer");
    expect(entityNames).toContain("Opportunity");
    expect(entityNames).toContain("Agent");
    expect(entityNames).toContain("Deal");
    expect(entityNames.length).toBeGreaterThan(10);
  });

  it("should have a DB table for every registered entity", async () => {
    const ds = fastify.db.userRepository.manager.connection;
    for (const metadata of ds.entityMetadatas) {
      if (metadata.tableType === "view") {continue;}
      const result: { exists: string }[] = await ds.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [metadata.tableName],
      );
      expect(
        result[0].exists,
        `Table "${metadata.tableName}" (entity: ${metadata.name}) is missing from the database`,
      ).toBe(true);
    }
  });
});
