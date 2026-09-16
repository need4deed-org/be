import { describe, expect, it, vi } from "vitest";
import { runNamedCronJobs } from "../../../../server/utils/data/run-named-cron-jobs";

const loggerErrorMock = vi.fn();
const loggerInfoMock = vi.fn();
vi.mock("../../../../logger", () => ({
  default: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

describe("runNamedCronJobs", () => {
  it("runs jobs concurrently by default", async () => {
    const order: string[] = [];
    const first = vi.fn(async () => {
      order.push("first:start");
      await Promise.resolve();
      order.push("first:end");
    });
    const second = vi.fn(async () => {
      order.push("second:start");
      order.push("second:end");
    });

    await runNamedCronJobs([
      { name: "first", run: first },
      { name: "second", run: second },
    ]);

    // Second starts before first finishes — they overlap.
    expect(order).toEqual([
      "first:start",
      "second:start",
      "second:end",
      "first:end",
    ]);
  });

  it("be#987 review: runs jobs one after another when sequential is set, so a later job never starts before an earlier one finishes", async () => {
    const order: string[] = [];
    const first = vi.fn(async () => {
      order.push("first:start");
      await Promise.resolve();
      order.push("first:end");
    });
    const second = vi.fn(async () => {
      order.push("second:start");
      order.push("second:end");
    });

    await runNamedCronJobs(
      [
        { name: "first", run: first },
        { name: "second", run: second },
      ],
      { sequential: true },
    );

    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("runs the remaining jobs sequentially even when an earlier one throws", async () => {
    const first = vi.fn(async () => {
      throw new Error("boom");
    });
    const second = vi.fn(async () => {});

    await runNamedCronJobs(
      [
        { name: "first", run: first },
        { name: "second", run: second },
      ],
      { sequential: true },
    );

    expect(second).toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "scheduler: first failed",
    );
  });
});
