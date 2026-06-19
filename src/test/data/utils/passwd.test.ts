import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../data/utils";

// These tests exercise the real bcrypt implementation. Externalized node
// modules (like bcrypt) are not intercepted by `vi.mock` under the swc
// transform used here, so mocking bcrypt is not reliable — we test behaviour.

describe("hashPassword", () => {
  it("returns a bcrypt hash that differs from the plain text", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe("mypassword");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("wraps bcrypt errors in a generic message", async () => {
    // bcrypt.hash throws when given non-string data, hitting the catch branch.
    await expect(hashPassword(undefined as never)).rejects.toThrow(
      "Could not hash password.",
    );
  });
});

describe("verifyPassword", () => {
  it("returns true when the password matches the hash", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
  });

  it("returns false when the password does not match the hash", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("wraps bcrypt errors in a generic message", async () => {
    // bcrypt.compare throws when the hash argument is missing.
    await expect(verifyPassword("plain", undefined as never)).rejects.toThrow(
      "Could not verify password.",
    );
  });
});
