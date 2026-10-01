import { FastifyInstance } from "fastify";
import cron from "node-cron";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer } from "../../../server";
import * as activateDueOnetimers from "../../../services/jobs/activate-due-onetimers";
import * as scanAccompanyNotFound from "../../../services/jobs/scan-accompany-not-found";
import * as scanExpiredOnetimers from "../../../services/jobs/scan-expired-onetimers";
import * as scanPostMatchCheckup from "../../../services/jobs/scan-post-match-checkup";
import * as scanRegularUpdate from "../../../services/jobs/scan-regular-update";
import * as scanStalePending from "../../../services/jobs/scan-stale-pending";

const DAILY = "0 6 * * *";
const HOURLY = "0 8-19 * * 1-5";

// createServer re-initialises the DB connection: slower than the 5 s default.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

// be#1077: the daily onetimer status jobs always run; the hourly scans,
// which only send emails, stay off until be#1088 routes them to Slack.
describe("cron schedulers", () => {
  let fastify: FastifyInstance;
  const callbacks = new Map<string, () => Promise<void>>();

  const daily = {
    activateDueOnetimers: vi
      .spyOn(activateDueOnetimers, "activateDueOnetimers")
      .mockResolvedValue(undefined),
    scanExpiredOnetimers: vi
      .spyOn(scanExpiredOnetimers, "scanExpiredOnetimers")
      .mockResolvedValue(undefined),
  };
  const hourly = [
    vi.spyOn(scanStalePending, "scanStalePending").mockResolvedValue(undefined),
    vi
      .spyOn(scanPostMatchCheckup, "scanPostMatchCheckup")
      .mockResolvedValue(undefined),
    vi
      .spyOn(scanAccompanyNotFound, "scanAccompanyNotFound")
      .mockResolvedValue(undefined),
    vi
      .spyOn(scanRegularUpdate, "scanRegularUpdate")
      .mockResolvedValue(undefined),
  ];

  beforeAll(async () => {
    const schedule = vi.spyOn(cron, "schedule");
    fastify = await createServer();
    await fastify.ready();
    for (const [expression, callback] of schedule.mock.calls) {
      callbacks.set(expression as string, callback as () => Promise<void>);
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fastify?.close();
  });

  it("runs the daily onetimer status jobs, in order", async () => {
    await callbacks.get(DAILY)?.();

    expect(daily.activateDueOnetimers).toHaveBeenCalledTimes(1);
    expect(daily.scanExpiredOnetimers).toHaveBeenCalledTimes(1);
    expect(daily.activateDueOnetimers.mock.invocationCallOrder[0]).toBeLessThan(
      daily.scanExpiredOnetimers.mock.invocationCallOrder[0],
    );
  });

  it("runs none of the hourly email scans", async () => {
    expect(callbacks.has(HOURLY)).toBe(true);

    await callbacks.get(HOURLY)?.();

    for (const scan of hourly) {
      expect(scan).not.toHaveBeenCalled();
    }
  });
});
