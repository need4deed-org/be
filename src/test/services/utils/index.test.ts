import { describe, expect, it, vi } from "vitest";
import { deepMerge, isObject, tryCatchFn } from "../../../services/utils";

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

describe("isObject", () => {
  it("should return true for plain objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  it("should return false for arrays, null, and primitives", () => {
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject("string")).toBe(false);
    expect(isObject(42)).toBe(false);
    expect(isObject(() => {})).toBe(false); // Functions are technically objects, but typeof is 'function'
  });
});

describe("deepMerge", () => {
  it("should merge flat properties", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMerge(target, source);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should merge nested objects without losing sibling keys", () => {
    const target = {
      user: { name: "Alice", settings: { theme: "dark" } },
    };
    const source = {
      user: { settings: { font: "Inter" }, age: 25 },
    };

    const result = deepMerge(target, source);

    expect(result).toEqual({
      user: {
        name: "Alice",
        age: 25,
        settings: {
          theme: "dark",
          font: "Inter",
        },
      },
    });
  });

  it("should not mutate the original target object", () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };

    deepMerge(target, source);

    expect(target).toEqual({ a: { b: 1 } });
    expect(target.a).not.toHaveProperty("c");
  });

  it("should overwrite a primitive with an object if the key exists", () => {
    const target = { data: 100 };
    const source = { data: { value: 100 } };

    const result = deepMerge(target, source);
    expect(result.data).toEqual({ value: 100 });
  });

  it("should add a nested object from source if it does not exist in target", () => {
    const target = { a: 1 };
    const source = { b: { c: 2 } };

    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: { c: 2 } });
  });

  it("should handle arrays as primitives (overwriting instead of merging)", () => {
    // Per your isObject implementation, arrays are NOT merged
    const target = { list: [1, 2] };
    const source = { list: [3] };

    const result = deepMerge(target, source);
    expect(result.list).toEqual([3]);
  });
});
