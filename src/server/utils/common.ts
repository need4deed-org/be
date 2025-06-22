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
