import * as crypto from "node:crypto";
import { Lang, UserRole } from "need4deed-sdk";
import { defaultPageSize } from "../../config";

/**
 * Generates a cryptographically secure, pseudo-random hexadecimal string of a specified length.
 *
 * This function uses Node.js's built-in `crypto` module to generate random bytes,
 * which are then converted into a hexadecimal string. It's suitable for generating
 * secure tokens, IDs, or keys.
 *
 * @param {number} length - The desired length of the random hexadecimal string.
 * If `length` is an odd number, the last character of the
 * generated hex string will be truncated to match the exact length.
 * The function ensures the output string will always have
 * the exact `length` specified.
 * @returns {string} A random string consisting of hexadecimal characters (0-9, a-f).
 *
 * @throws {Error} If `crypto.randomBytes` encounters an error (e.g., insufficient entropy).
 */
export function generateRandomString(length) {
  // Each byte converts to 2 hex characters.
  // So, for 64 hex characters, you need 32 bytes.
  const numBytes = Math.ceil(length / 2);
  const buffer = crypto.randomBytes(numBytes);
  return buffer.toString("hex").slice(0, length); // Slice to ensure exact length if odd
}

/**
 * Converts a given ISO 639-1 language code string into a validated `Lang` enum member.
 *
 * This function normalizes the input `isoCode` to lowercase and checks if it exists
 * within the predefined `Lang` enum values. If a match is found, it returns the
 * validated `Lang` code; otherwise, it returns `null`.
 *
 * @param {string} isoCode - The ISO 639-1 language code to validate (e.g., "en", "ES", "fr").
 * @returns {Lang | null} The validated `Lang` code if it's a supported language, otherwise `null`.
 */
export function getLanguageCode(isoCode: string): Lang | null {
  if (typeof isoCode !== "string") {
    return null;
  }
  const isoCodeNormalized = isoCode.toLowerCase() as Lang;
  if (Object.values(Lang).includes(isoCodeNormalized)) {
    return isoCodeNormalized;
  }

  return null;
}

/**
 * Removes `null` and `undefined` properties from an object, except for those
 * explicitly allowed via a whitelist.
 * * @template T - The type of the input object.
 * @param {T} obj - The source object to strip nullish values from.
 * @param {Array<keyof T | unknown>} nullable - An array of property keys that should be
 * preserved even if their values are null or undefined.
 * @returns {Partial<T>} A new object containing only non-nullish values and whitelisted keys.
 * * @example
 * const input = { name: "Alice", age: null, bio: null };
 * // Returns { name: "Alice" }
 * stripNullishAttributes(input, []);
 * * @example
 * // Returns { name: "Alice", bio: null }
 * stripNullishAttributes(input, ["bio"]);
 */
export function stripNullishAttributes<T>(
  obj: T,
  nullable: Array<unknown>,
): Partial<T> {
  if (obj === null || typeof obj !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      if (nullable?.includes(key)) {
        return true;
      }
      return value !== null && value !== undefined;
    }),
  ) as Partial<T>;
}

/**
 * Determines whether a value is a strictly empty plain object.
 *
 * - Returns `true` ONLY for empty plain objects (`{}`).
 * - Returns `false` for everything else (null, undefined, strings, numbers, arrays, Dates, populated objects).
 *
 * @param {unknown} obj - The value to test.
 * @returns {boolean} `true` if the value is `{}`; otherwise `false`.
 *
 * @example
 * isEmptyPlainObject({})             // → true
 * isEmptyPlainObject({ a: 1 })       // → false
 * isEmptyPlainObject([])             // → false
 * isEmptyPlainObject(new Date())     // → false
 * isEmptyPlainObject(null)           // → false
 * isEmptyPlainObject("some string")  // → false
 */
export function isEmptyPlainObject<T>(obj: T): boolean {
  if (obj === null || typeof obj !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(obj);
  const isPlainObject = proto === Object.prototype || proto === null;

  return isPlainObject && Object.keys(obj).length === 0;
}

/**
 * Returns a shallow copy of an object where all properties
 * that are empty objects or arrays are replaced with `null`.
 *
 * If the input is not an object (or is `null`), it is returned as-is.
 *
 * @template T - The type of the input object.
 * @param {T} obj - The object to transform.
 * @returns {T} A new object with empty objects replaced by `null`.
 *
 * @example
 * getEmptyPropsNull({ a: {}, b: { x: 1 }, c: [], d: [""] });
 * // → { a: null, b: { x: 1 }, c: null, d: [""] }
 */
export function getEmptyPropsNull<
  T extends Record<string, unknown | unknown[]>,
>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  return Object.keys(obj).reduce((acc: T, key: keyof T) => {
    const val = obj[key];
    acc[key] = isEmptyPlainObject(val)
      ? null
      : (getNullFromEmptyArray(val as unknown[]) as T[keyof T]);
    return acc;
  }, {} as T);
}

/**
 * Returns `null` if the provided array is empty.
 * Otherwise, returns the array itself.
 *
 * If the input is not an array or is `null`, it is returned unchanged.
 *
 * @template T - The type of elements in the array.
 * @param {T[] | null} arr - The array to check.
 * @returns {T[] | null} `null` if the array is empty, otherwise the original array.
 *
 * @example
 * getNullFromEmptyArray([]);      // → null
 * getNullFromEmptyArray([1, 2]);  // → [1, 2]
 * getNullFromEmptyArray(null);    // → null
 */
export function getNullFromEmptyArray<T>(arr: T[] | null): T[] | null {
  if (arr === null || !Array.isArray(arr) || arr.length > 0) {
    return arr;
  }
  return null;
}

/**
 * Checks if a user has permission to access an entity based on ownership or role.
 * * @template E - An entity type that includes a `userId` property.
 * @param {E} entity - The resource being checked.
 * @param {UserRole[]} roles - An array of roles authorized to bypass ownership (e.g., ADMIN).
 * @param {Object} user - The user attempting the action.
 * @param {number} user.id - The unique identifier of the user.
 * @param {UserRole} user.role - The role assigned to the user.
 * * @returns {boolean} `true` if the user is the owner OR has an authorized role; otherwise `false`.
 * * @example
 * const isAuthorized = validatePermissions(appreciation, [UserRole.ADMIN], currentUser);
 * if (isAuthorized) {
 * // Proceed with sensitive operation
 * }
 */
export function validatePermissions<E extends { userId: number }>(
  entity: E,
  roles: UserRole[],
  user: { id: number; role: UserRole },
) {
  return entity.userId === user.id || roles?.includes(user.role);
}

export function getRef(reference: string) {
  return { $ref: reference };
}

/**
 * Calculates pagination offsets (skip and take) based on page number and limit.
 * *
 *
 * @param {number} [page=1] - The current page number (1-indexed). Defaults to 1.
 * @param {number} [limit=12] - The number of items to return per page. Defaults to 10.
 * @returns {[number, number]} A tuple containing `[skip, take]`:
 * - `skip`: The number of records to bypass.
 * - `take`: The number of records to return.
 * * @example
 * const [skip, take] = getSkipTake(2, 20);
 * // returns [20, 20]
 */
export function getSkipTake(pageLimit?: {
  page?: number;
  limit?: number;
}): [number, number] {
  function isValid(value?: number) {
    return !isNaN(Number(value)) && value! > 0;
  }

  const { page, limit } = pageLimit || {};
  const take = isValid(limit) ? limit : defaultPageSize;
  const skip = ((isValid(page) ? page : 1)! - 1) * take!;
  return [skip, take!];
}
