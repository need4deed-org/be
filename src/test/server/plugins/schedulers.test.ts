import { FastifyInstance } from "fastify";
import { isWorkingDay } from "need4deed-sdk";
import cron from "node-cron";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createServer } from "../../../server";
import * as activateDueOnetimers from "../../../services/jobs/activate-due-onetimers";
import * as scanAccompanyNotFound from "../../../services/jobs/scan-accompany-not-found";
import * as scanExpiredOnetimers from "../../../services/jobs/scan-expired-onetimers";
import * as scanPostMatchCheckup from "../../../services/jobs/scan-post-match-checkup";
import * as scanRegularUpdate from "../../../services/jobs/scan-regular-update";
import * as scanStalePending from "../../../services/jobs/scan-stale-pending";

const DAILY = "0 6 * * *";

vi.mock("need4deed-sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("need4deed-sdk")>()),
  isWorkingDay: vi.fn(),
}));

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

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
  const scans = {
    scanStalePending: vi
      .spyOn(scanStalePending, "scanStalePending")
      .mockResolvedValue(undefined),
    scanPostMatchCheckup: vi
      .spyOn(scanPostMatchCheckup, "scanPostMatchCheckup")
      .mockResolvedValue(undefined),
    scanRegularUpdate: vi
      .spyOn(scanRegularUpdate, "scanRegularUpdate")
      .mockResolvedValue(undefined),
    scanAccompanyNotFound: vi
      .spyOn(scanAccompanyNotFound, "scanAccompanyNotFound")
      .mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const schedule = vi.spyOn(cron, "schedule");
    fastify = await createServer();
    await fastify.ready();
    for (const [expression, callback] of schedule.mock.calls) {
      callbacks.set(expression as string, callback as () => Promise<void>);
    }
  });

  beforeEach(() => {
    for (const spy of [...Object.values(daily), ...Object.values(scans)]) {
      spy.mockClear();
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fastify?.close();
  });

  it("runs the daily status jobs first, then every email scan, on a working day", async () => {
    vi.mocked(isWorkingDay).mockReturnValue(true);

    await callbacks.get(DAILY)?.();

    expect(daily.activateDueOnetimers).toHaveBeenCalledTimes(1);
    expect(daily.scanExpiredOnetimers).toHaveBeenCalledTimes(1);
    expect(daily.activateDueOnetimers.mock.invocationCallOrder[0]).toBeLessThan(
      daily.scanExpiredOnetimers.mock.invocationCallOrder[0],
    );
    for (const scan of Object.values(scans)) {
      expect(scan).toHaveBeenCalledTimes(1);
      expect(scan.mock.invocationCallOrder[0]).toBeGreaterThan(
        daily.scanExpiredOnetimers.mock.invocationCallOrder[0],
      );
    }
  });

  it("skips only the accompanying scan on a weekend or holiday", async () => {
    vi.mocked(isWorkingDay).mockReturnValue(false);

    await callbacks.get(DAILY)?.();

    expect(scans.scanAccompanyNotFound).not.toHaveBeenCalled();
    expect(scans.scanStalePending).toHaveBeenCalledTimes(1);
    expect(scans.scanPostMatchCheckup).toHaveBeenCalledTimes(1);
    expect(scans.scanRegularUpdate).toHaveBeenCalledTimes(1);
    expect(daily.activateDueOnetimers).toHaveBeenCalledTimes(1);
  });

  it("schedules nothing but the daily jobs", () => {
    expect([...callbacks.keys()]).toEqual([DAILY]);
  });
});
