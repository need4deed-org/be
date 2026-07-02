import { describe, expect, it } from "vitest";
import Address from "../../../data/entity/location/address.entity";
import { serializeAddress } from "../../../services/dto";

describe("serializeAddress", () => {
  it("should return a full formatted address when all fields are present", () => {
    const address = {
      street: "Friedrichstraße 1",
      postcode: { value: "10117" },
      city: "Berlin",
    } as Address;

    expect(serializeAddress(address)).toBe("Friedrichstraße 1, 10117 Berlin");
  });

  it("should omit city when it is missing", () => {
    const address = {
      street: "Friedrichstraße 1",
      postcode: { value: "10117" },
      city: undefined,
    } as Address;

    expect(serializeAddress(address)).toBe("Friedrichstraße 1, 10117");
  });

  it("should handle missing postcode gracefully", () => {
    const address = {
      street: "Hauptstraße 5",
      city: "Munich",
    } as Address;

    expect(serializeAddress(address)).toBe("Hauptstraße 5, Munich");
  });

  it("should handle missing street by only returning postcode and city", () => {
    const address = {
      postcode: { value: "20095" },
      city: "Hamburg",
    } as Address;

    expect(serializeAddress(address)).toBe("20095 Hamburg");
  });

  it("should return empty string if the address object is null or undefined", () => {
    expect(serializeAddress(null)).toBe("");
    expect(serializeAddress(undefined)).toBe("");
  });

  it("should return empty string for an empty address object", () => {
    const address = {} as Address;

    expect(serializeAddress(address)).toBe("");
  });
});
