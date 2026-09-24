import { describe, expect, it } from "vitest";
import { emailTransformer } from "../../../data/lib/email-transformer";

describe("emailTransformer", () => {
  it("lowercases and trims on write", () => {
    expect(emailTransformer.to(" Foo@Example.COM ")).toBe("foo@example.com");
  });

  it("passes null/undefined through", () => {
    expect(emailTransformer.to(null)).toBeNull();
    expect(emailTransformer.to(undefined)).toBeUndefined();
  });

  it("returns the stored value unchanged on read", () => {
    expect(emailTransformer.from("foo@example.com")).toBe("foo@example.com");
  });
});
