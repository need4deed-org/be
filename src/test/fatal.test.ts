import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFatalHandler,
  fatalAlertText,
  FatalDeps,
  installFatalHandlers,
  toError,
} from "../fatal";

function fakeDeps(alertOps: FatalDeps["alertOps"]) {
  const logFatal = vi.fn();
  const logFlush = vi.fn((cb?: () => void) => cb?.());
  return {
    logFatal,
    logFlush,
    logger: { fatal: logFatal, flush: logFlush },
    exit: vi.fn(),
    alertOps: vi.fn(alertOps),
    timeoutMs: 5_000,
  };
}

describe("createFatalHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("logs the error at fatal, alerts ops, flushes and exits 1", async () => {
    const deps = fakeDeps(async () => undefined);
    const error = new Error("boom");

    createFatalHandler(deps as unknown as FatalDeps)(
      "uncaughtException",
      error,
    );
    await vi.runAllTimersAsync();

    expect(deps.logFatal).toHaveBeenCalledWith(
      { err: error },
      "uncaughtException, exiting",
    );
    expect(deps.alertOps).toHaveBeenCalledWith(
      expect.stringContaining("(uncaughtException): boom"),
    );
    expect(deps.logFlush).toHaveBeenCalledTimes(1);
    expect(deps.exit).toHaveBeenCalledTimes(1);
    expect(deps.exit).toHaveBeenCalledWith(1);
  });

  it("still exits when the ops alert fails", async () => {
    const deps = fakeDeps(async () => {
      throw new Error("slack down");
    });

    createFatalHandler(deps as unknown as FatalDeps)(
      "unhandledRejection",
      "rejected",
    );
    await vi.runAllTimersAsync();

    expect(deps.logFatal).toHaveBeenCalledWith(
      { err: expect.objectContaining({ message: "slack down" }) },
      "ops alert for the fatal error failed",
    );
    expect(deps.exit).toHaveBeenCalledWith(1);
  });

  it("exits after the timeout when the alert hangs", async () => {
    const deps = fakeDeps(() => new Promise<void>(() => undefined));

    createFatalHandler(deps as unknown as FatalDeps)(
      "uncaughtException",
      new Error("boom"),
    );
    await vi.advanceTimersByTimeAsync(4_999);
    expect(deps.exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(deps.exit).toHaveBeenCalledWith(1);
  });

  it("only logs a second fatal error while exiting", async () => {
    const deps = fakeDeps(() => new Promise<void>(() => undefined));
    const onFatal = createFatalHandler(deps as unknown as FatalDeps);

    onFatal("uncaughtException", new Error("first"));
    onFatal("unhandledRejection", new Error("second"));

    expect(deps.alertOps).toHaveBeenCalledTimes(1);
    expect(deps.logFatal).toHaveBeenLastCalledWith(
      { err: expect.objectContaining({ message: "second" }) },
      "unhandledRejection while exiting",
    );
  });
});

describe("installFatalHandlers", () => {
  it("routes uncaughtException and unhandledRejection to the handler", () => {
    const target = new EventEmitter();
    const onFatal = vi.fn();
    installFatalHandlers(onFatal, target as unknown as typeof process);

    const error = new Error("thrown");
    target.emit("uncaughtException", error);
    target.emit("unhandledRejection", "reason");

    expect(onFatal).toHaveBeenNthCalledWith(1, "uncaughtException", error);
    expect(onFatal).toHaveBeenNthCalledWith(2, "unhandledRejection", "reason");
  });
});

describe("fatalAlertText", () => {
  it("names the kind and message and caps the stack", () => {
    const error = new Error("boom");
    error.stack = [
      "Error: boom",
      ...Array.from({ length: 30 }, (_, i) => `    at f${i}`),
    ].join("\n");

    const text = fatalAlertText("uncaughtException", error);

    expect(text).toMatch(/is exiting \(uncaughtException\): boom/);
    expect(text).toContain("at f10");
    expect(text).not.toContain("at f11");
  });
});

describe("toError", () => {
  it("wraps a non-Error reason", () => {
    expect(toError("nope")).toEqual(new Error("nope"));
    const error = new Error("kept");
    expect(toError(error)).toBe(error);
  });
});
