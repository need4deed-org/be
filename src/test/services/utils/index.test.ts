import { describe, expect, it, vi } from "vitest";
import { tryCatchFn } from "../../../services/utils";

describe("tryCatchFn", () => {
  it("should return the result of the function when it succeeds", () => {
    const add = (a: number, b: number) => a + b;
    const logger = vi.fn();

    const safeAdd = tryCatchFn(add, logger);
    const result = safeAdd(2, 3);

    expect(result).toBe(5);
    expect(logger).not.toHaveBeenCalled();
  });

  it("should call the logger and return null when the function throws", () => {
    const errorMessage = "Boom!";
    const thrower = () => {
      throw new Error(errorMessage);
    };
    const logger = vi.fn();

    const safeThrower = tryCatchFn(thrower, logger);
    const result = safeThrower();

    expect(result).toBeNull();
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
      }),
    );
  });

  it("should maintain the correct arguments when calling the original function", () => {
    const fn = vi.fn((a: string, b: boolean) => (b ? a : "default"));
    const logger = vi.fn();

    const safeFn = tryCatchFn(fn, logger);
    safeFn("hello", true);

    expect(fn).toHaveBeenCalledWith("hello", true);
  });

  it("should work with built-in functions like JSON.parse", () => {
    const logger = vi.fn();
    const safeParse = tryCatchFn(JSON.parse, logger);

    // Valid Case
    expect(safeParse('{"id": 1}')).toEqual({ id: 1 });

    // Invalid Case
    expect(safeParse("invalid content")).toBeNull();
    expect(logger).toHaveBeenCalled();
  });
});
