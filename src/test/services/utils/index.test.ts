import path from "path";
import { describe, expect, it, vi } from "vitest";
import { BadRequestError } from "../../../config/error";
import {
  deepMerge,
  getDateObj,
  isObject,
  isProbablyFileSystemPath,
  pascal2snake,
  tryCatchFn,
} from "../../../services/utils";

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

  it("should handle empty objects)", () => {
    const obj = { a: 1, b: { c: 3, d: { e: 4 } } };
    const empty = {};

    const resultObj = deepMerge(obj, empty);
    const resultEmpty = deepMerge(empty, obj);
    expect(resultObj).toEqual(obj);
    expect(resultEmpty).toEqual(obj);
  });
});

describe("pascal2snake", () => {
  describe("Basic Transformations", () => {
    it("should insert underscores between camel/pascal boundaries", () => {
      expect(pascal2snake("UserProfile")).toBe("User_Profile");
      expect(pascal2snake("PatientMedicalRecord")).toBe(
        "Patient_Medical_Record",
      );
    });

    it("should handle single word strings without adding underscores", () => {
      expect(pascal2snake("User")).toBe("User");
    });

    it("should handle numbers as boundaries", () => {
      // Because of your updated ([a-z0-9]) regex
      expect(pascal2snake("Address2Data")).toBe("Address2_Data");
    });
  });

  describe("Casing Options", () => {
    it('should return UPPER_SNAKE_CASE when caseTo is "upper"', () => {
      expect(pascal2snake("UserProfile", "upper")).toBe("USER_PROFILE");
      expect(pascal2snake("User", "upper")).toBe("USER");
    });

    it('should return lower_snake_case when caseTo is "lower"', () => {
      expect(pascal2snake("UserProfile", "lower")).toBe("user_profile");
    });

    it("should return the raw snake string if no caseTo is provided", () => {
      // It keeps original casing but adds underscores
      expect(pascal2snake("UserProfile")).toBe("User_Profile");
    });
  });

  describe("Edge Cases", () => {
    it("should handle already snake_cased strings", () => {
      expect(pascal2snake("USER_PROFILE", "upper")).toBe("USER_PROFILE");
    });

    it("should handle strings with acronyms correctly", () => {
      // Note: 'ID' (Upper-Upper) does not match ([a-z0-9])([A-Z])
      // This is usually desired so you don't get U_S_E_R_I_D
      expect(pascal2snake("UserID", "upper")).toBe("USER_ID");
      expect(pascal2snake("UserID", "lower")).toBe("user_id");
    });
  });
});

describe("isProbablyFileSystemPath", () => {
  describe("Positive Cases (Should return true)", () => {
    it("identifies absolute paths", () => {
      // Mocking path.isAbsolute to ensure the logic flows correctly
      const spy = vi.spyOn(path, "isAbsolute").mockReturnValueOnce(true);
      expect(isProbablyFileSystemPath("/usr/bin/node")).toBe(true);
      spy.mockRestore();
    });

    it("identifies relative paths starting with dot", () => {
      expect(isProbablyFileSystemPath("./config.json")).toBe(true);
      expect(isProbablyFileSystemPath("../images/logo.png")).toBe(true);
    });

    it("identifies strings containing forward slashes", () => {
      expect(isProbablyFileSystemPath("folder/file.txt")).toBe(true);
    });

    it("identifies strings containing backslashes (Windows style)", () => {
      expect(isProbablyFileSystemPath("C:\\Users\\Guest")).toBe(true);
      expect(isProbablyFileSystemPath("relative\\path")).toBe(true);
    });
  });

  describe("Negative Cases (Should return false)", () => {
    it("returns false for non-string inputs", () => {
      expect(isProbablyFileSystemPath(null)).toBe(false);
      // @ts-expect-error
      expect(isProbablyFileSystemPath(123)).toBe(false);
    });

    it("returns false for URLs with protocols", () => {
      expect(isProbablyFileSystemPath("https://google.com")).toBe(false);
      expect(isProbablyFileSystemPath("ftp://server.local")).toBe(false);
      expect(isProbablyFileSystemPath("mailto:someone@example.com")).toBe(
        false,
      );
    });

    it("returns false for empty or whitespace strings", () => {
      expect(isProbablyFileSystemPath("")).toBe(false);
      expect(isProbablyFileSystemPath("   ")).toBe(false);
    });

    it("returns false for plain words without path markers", () => {
      expect(isProbablyFileSystemPath("filename")).toBe(false);
      expect(isProbablyFileSystemPath("just_a_string")).toBe(false);
    });
  });
});

describe("getDateObj()", () => {
  it("should return a valid Date object when given valid inputs", () => {
    const dateStr = "2026-03-11";
    const timeStr = "14:30";

    const result = getDateObj(dateStr, timeStr);

    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2); // March is 0-indexed
    expect(result.getDate()).toBe(11);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });

  it("should handle single digit hours and minutes correctly", () => {
    const result = getDateObj("2026-05-20", "09:05");

    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(5);
  });

  it("should throw BadRequestError if the date string is invalid", () => {
    const invalidDate = "not-a-date";
    const time = "12:00";

    expect(() => getDateObj(invalidDate, time)).toThrow(BadRequestError);
    expect(() => getDateObj(invalidDate, time)).toThrow(
      "Date and/or time is invalid.",
    );
  });

  it("should throw BadRequestError if the time string is formatted incorrectly", () => {
    const date = "2026-01-01";
    const invalidTime = "noon";

    expect(() => getDateObj(date, invalidTime)).toThrow(BadRequestError);
  });

  it("should handle null or undefined time gracefully via the fallback", () => {
    // Because of the `time?.split(":") || ""` logic:
    // hours/minutes become undefined, Number(undefined) is NaN,
    // resulting in an Invalid Date, which triggers the error.
    expect(() => getDateObj("2026-01-01", null as any)).toThrow(
      BadRequestError,
    );
  });
});
