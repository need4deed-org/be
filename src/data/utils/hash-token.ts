import * as crypto from "crypto";

// SHA-256, not bcrypt: this hashes high-entropy random tokens (API keys),
// not low-entropy human passwords — no need to slow-hash, and a fast
// deterministic digest lets it be looked up via an indexed exact match
// instead of a linear bcrypt.compare scan over every row.
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
