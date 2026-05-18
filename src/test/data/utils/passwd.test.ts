import * as bcrypt from "bcrypt";
import { describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../../../data/utils";

vi.mock("bcrypt");

describe("hashPassword", () => {
  it("uses 10 salt rounds and returns the resulting hash", async () => {
    vi.mocked(bcrypt.genSalt).mockResolvedValue("fakesalt" as any);
    vi.mocked(bcrypt.hash).mockResolvedValue("$2b$10$fakehash" as any);

    const result = await hashPassword("mypassword");

    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", "fakesalt");
    expect(result).toBe("$2b$10$fakehash");
  });

  it("wraps bcrypt errors in a generic message", async () => {
    vi.mocked(bcrypt.genSalt).mockRejectedValue(new Error("bcrypt internal failure"));
    await expect(hashPassword("password")).rejects.toThrow("Could not hash password.");
  });
});

describe("verifyPassword", () => {
  it("returns true when bcrypt.compare resolves to true", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

    const result = await verifyPassword("plain", "$2b$10$hash");

    expect(bcrypt.compare).toHaveBeenCalledWith("plain", "$2b$10$hash");
    expect(result).toBe(true);
  });

  it("returns false when bcrypt.compare resolves to false", async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
    expect(await verifyPassword("wrong", "$2b$10$hash")).toBe(false);
  });

  it("wraps bcrypt errors in a generic message", async () => {
    vi.mocked(bcrypt.compare).mockRejectedValue(new Error("bcrypt internal failure"));
    await expect(verifyPassword("plain", "hash")).rejects.toThrow("Could not verify password.");
  });
});
