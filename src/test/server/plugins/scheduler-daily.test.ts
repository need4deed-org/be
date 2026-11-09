import cron from "node-cron";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "../../../server";

vi.setConfig({ testTimeout: 30_000 });

describe("daily scheduler under NODE_ENV=test", () => {
  it("is not scheduled, so test servers never run the daily jobs against the shared test DB", async () => {
    const schedule = vi.spyOn(cron, "schedule");
    const fastify = await createServer();
    try {
      await fastify.ready();
      expect(schedule).not.toHaveBeenCalled();
    } finally {
      schedule.mockRestore();
      await fastify.close();
    }
  });
});
