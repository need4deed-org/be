import { Lang } from "need4deed-sdk";
import * as crypto from "node:crypto";

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
 * Removes all properties from an object whose values are `null` or `undefined`.
 *
 * - Safely returns an empty object if the input is `null`, `undefined`, or not an object.
 * - Keeps other falsy values (like `0`, `false`, `''`, `NaN`).
 *
 * @template T
 * @param {T} obj - The input object to clean.
 * @returns {Partial<T>} A shallow copy of `obj` with only non-nullish properties retained.
 *
 * @example
 * stripNullishAttributes({ a: 1, b: null, c: undefined, d: 0 })
 * // → { a: 1, d: 0 }
 *
 * @example
 * stripNullishAttributes(null)
 * // → {}
 */
export function stripNullishAttributes<T>(obj: T): Partial<T> {
  if (obj === null || typeof obj !== "object") return {};

  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  ) as Partial<T>;
}

/**
 * Determines whether a value is an empty plain object
 * or not an object created by the `Object` constructor.
 *
 * - Returns `true` for:
 *   - Empty plain objects (`{}`)
 *   - Non-object values (`null`, numbers, strings, etc.)
 *   - Non-plain objects (arrays, dates, custom instances, etc.)
 * - Returns `false` only for non-empty plain objects.
 *
 * @param {object} obj - The value to test.
 * @returns {boolean} `true` if the value is an empty plain object or not an object created by `Object`; otherwise `false`.
 *
 * @example
 * isObjectAndEmpty({})           // → true
 * isObjectAndEmpty({ a: 1 })     // → false
 * isObjectAndEmpty([])           // → true
 * isObjectAndEmpty(new Date())   // → true
 * isObjectAndEmpty(null)         // → true
 */
export function isObjectAndEmpty<T>(obj: T): boolean {
  if (obj === null || typeof obj !== "object") return true;

  const proto = Object.getPrototypeOf(obj);
  const isPlainObject = proto === Object.prototype || proto === null;

  return !isPlainObject || Object.keys(obj).length === 0;
}

/**
 * Returns a shallow copy of an object where all properties
 * that are empty objects are replaced with `null`.
 *
 * If the input is not an object (or is `null`), it is returned as-is.
 *
 * @template T - The type of the input object.
 * @param {T} obj - The object to transform.
 * @returns {T} A new object with empty objects replaced by `null`.
 *
 * @example
 * getEmptyPropsNull({ a: {}, b: { x: 1 }, c: [] });
 * // → { a: null, b: { x: 1 }, c: [] }
 */
export function getEmptyPropsNull<T extends Record<string, unknown>>(
  obj: T,
): T {
  if (obj === null || typeof obj !== "object") return obj;

  return Object.keys(obj).reduce((acc: T, key: keyof T) => {
    const val = obj[key];
    acc[key] = isObjectAndEmpty(val) ? null : val;
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
