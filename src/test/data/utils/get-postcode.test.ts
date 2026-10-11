import { describe, expect, it } from "vitest";
import { normalizePostcode } from "../../../data/utils/get-postcode";

describe("normalizePostcode", () => {
  it("restores the leading zero dropped by numeric postal_code", () => {
    expect(normalizePostcode(String(Number("01067")))).toBe("01067");
    expect(normalizePostcode("4109")).toBe("04109");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePostcode(" 10115 ")).toBe("10115");
    expect(normalizePostcode(" 1067\n")).toBe("01067");
  });

  it("leaves five-digit postcodes unchanged", () => {
    expect(normalizePostcode("10115")).toBe("10115");
    expect(normalizePostcode("01067")).toBe("01067");
  });

  it("does not pad values that are not four digits", () => {
    expect(normalizePostcode("123")).toBe("123");
    expect(normalizePostcode("abcd")).toBe("abcd");
    expect(normalizePostcode("")).toBe("");
  });
});
