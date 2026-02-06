import { UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import {
  generateRandomString,
  getEmptyPropsNull,
  getLanguageCode,
  getNullFromEmptyArray,
  getSkipTake,
  isEmptyPlainObject,
  stripNullishAttributes,
  validatePermissions,
} from "../../../server/utils/common";

describe("generateRandomString()", () => {
  it("generateRandomString returns hex string of requested length", () => {
    const s1 = generateRandomString(10);
    expect(typeof s1).toBe("string");
    expect(s1).toHaveLength(10);
    expect(/^[0-9a-f]+$/.test(s1)).toBe(true);

    const s2 = generateRandomString(7);
    expect(s2).toHaveLength(7);
    expect(/^[0-9a-f]+$/.test(s2)).toBe(true);

    expect(generateRandomString(0)).toBe("");
  });
});

describe("getLanguageCode()", () => {
  it("getLanguageCode normalizes and validates lang codes", () => {
    expect(getLanguageCode("EN")).toBe("en");
    expect(getLanguageCode("de")).toBe("de");
    expect(getLanguageCode("En")).toBe("en");
    expect(getLanguageCode("es")).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((getLanguageCode as any)(123)).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((getLanguageCode as any)(undefined)).toBeNull();
  });
});

describe("stripNullishAttributes()", () => {
  it("stripNullishAttributes removes null/undefined except nullable keys", () => {
    const input = { a: 1, b: null, c: undefined, d: 0, e: false, f: "" };
    expect(stripNullishAttributes(input, [])).toEqual({
      a: 1,
      d: 0,
      e: false,
      f: "",
    });
    expect(stripNullishAttributes(input, ["b", "c"])).toEqual({
      a: 1,
      b: null,
      c: undefined,
      d: 0,
      e: false,
      f: "",
    });
    expect(stripNullishAttributes(null as any, [])).toEqual({});
  });
});

describe("isEmptyPlainObject()", () => {
  it("isEmptyPlainObject behaves for various types", () => {
    expect(isEmptyPlainObject({})).toBe(true);
    expect(isEmptyPlainObject({ a: 1 })).toBe(false);
    expect(isEmptyPlainObject({ a: {} })).toBe(false);
    expect(isEmptyPlainObject([])).toBe(false);
    expect(isEmptyPlainObject(new Date())).toBe(false);
    expect(isEmptyPlainObject(Object.create(null))).toBe(true);
    expect(isEmptyPlainObject(null)).toBe(false);
    expect(isEmptyPlainObject(() => {})).toBe(false);
    class C {}
    expect(isEmptyPlainObject(new C())).toBe(false);
  });
});

describe("getEmptyPropsNull", () => {
  it("getEmptyPropsNull replaces empty plain objects with null (shallow)", () => {
    const src = { a: {}, b: { x: 1 }, c: [], d: Object.create(null) };
    expect(getEmptyPropsNull(src)).toEqual({
      a: null,
      b: { x: 1 },
      c: [],
      d: null,
    });
    expect(getEmptyPropsNull({ name: "Adam" })).toEqual({ name: "Adam" });

    // shallow behaviour: nested empty objects are preserved in parent objects
    const nested = { p: { inner: {} } };
    expect(getEmptyPropsNull(nested)).toEqual({ p: { inner: {} } });

    // non-object returned as-is
    expect(getEmptyPropsNull(null as any)).toBeNull();
    expect(getEmptyPropsNull(42 as unknown as any)).toBe(42);
  });
});

describe("getNullFromEmptyArray", () => {
  it("getNullFromEmptyArray returns null only for empty arrays", () => {
    expect(getNullFromEmptyArray([])).toBeNull();
    expect(getNullFromEmptyArray([1, 2])).toEqual([1, 2]);
    expect(getNullFromEmptyArray(null)).toBeNull();
    // non-array passes through unchanged
    expect(getNullFromEmptyArray({} as unknown as any)).toEqual({});
  });
});

describe("validatePermissions", () => {
  it("validatePermissions allows owner or authorised roles", () => {
    const entity = { userId: 1 };
    expect(
      validatePermissions(entity, [UserRole.ADMIN], {
        id: 1,
        role: UserRole.USER,
      }),
    ).toBe(true);
    expect(
      validatePermissions(entity, [UserRole.ADMIN], {
        id: 2,
        role: UserRole.ADMIN,
      }),
    ).toBe(true);
    // neither owner nor authorised -> false
    expect(
      validatePermissions(entity, [UserRole.ADMIN], {
        id: 2,
        role: UserRole.USER,
      }),
    ).toBe(false);
    // empty roles: only owner allowed
    expect(
      validatePermissions(entity, [], { id: 1, role: UserRole.USER }),
    ).toBe(true);
    expect(
      validatePermissions(entity, [], { id: 2, role: UserRole.ADMIN }),
    ).toBe(false);
  });
});

describe("getSkipTake()", () => {
  it("should return default values [0, 10] when no arguments are provided", () => {
    const result = getSkipTake();
    expect(result).toEqual([0, 10]);
  });

  it("should calculate the correct skip for the first page", () => {
    const [skip, take] = getSkipTake(1, 20);
    expect(skip).toBe(0);
    expect(take).toBe(20);
  });

  it("should calculate the correct skip for subsequent pages", () => {
    expect(getSkipTake(3, 10)).toEqual([20, 10]);

    expect(getSkipTake(2, 50)).toEqual([50, 50]);
  });

  it("should handle undefined page or limit by using defaults", () => {
    expect(getSkipTake(undefined, 15)).toEqual([0, 15]);

    expect(getSkipTake(5, undefined)).toEqual([40, 10]);
  });

  it("should return 0 skip if page is provided as 0 (due to falsy check)", () => {
    expect(getSkipTake(0, 10)).toEqual([0, 10]);
  });
});
