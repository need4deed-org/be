import * as crypto from "node:crypto";

export function generateRandomString(length) {
  // Each byte converts to 2 hex characters.
  // So, for 64 hex characters, you need 32 bytes.
  const numBytes = Math.ceil(length / 2);
  const buffer = crypto.randomBytes(numBytes);
  return buffer.toString("hex").slice(0, length); // Slice to ensure exact length if odd
}
