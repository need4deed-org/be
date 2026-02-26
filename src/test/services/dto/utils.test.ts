import { describe, expect, it } from "vitest";
import { getNameFields } from "../../../services/dto";

describe("getNameFields", () => {
  it("should split a full name into first, middle, and last", () => {
    const result = getNameFields("John Quincy Adams");

    expect(result).toEqual({
      firstName: "John",
      lastName: "Adams",
      middleName: "Quincy",
    });
  });

  it("should handle multiple middle names by joining them", () => {
    const result = getNameFields("Herbert Bedford Fosbury III");

    expect(result).toEqual({
      firstName: "Herbert",
      lastName: "III",
      middleName: "Bedford Fosbury",
    });
  });

  it("should handle only two names (no middle name)", () => {
    const result = getNameFields("Jane Doe");

    expect(result).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      middleName: undefined,
    });
  });

  it("should handle a single name", () => {
    const result = getNameFields("Prince");

    expect(result).toEqual({
      firstName: "Prince",
      lastName: undefined,
      middleName: undefined,
    });
  });

  it("should handle an empty string", () => {
    const result = getNameFields("");

    expect(result).toEqual({
      firstName: undefined,
      lastName: undefined,
      middleName: undefined,
    });
  });
});
