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

  it('should use "Berlin" as default when city is missing', () => {
    const address = {
      street: "Friedrichstraße 1",
      postcode: { value: "10117" },
      city: undefined,
    } as Address;

    // Based on: address.city ? address.city : "Berlin"
    expect(serializeAddress(address)).toBe("Friedrichstraße 1, 10117 Berlin");
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

  it('should return "Berlin" if the address object is null or undefined', () => {
    // @ts-expect-error - testing runtime robustness for JS consumers
    expect(serializeAddress(null)).toBe("Berlin");
    // @ts-expect-error
    expect(serializeAddress(undefined)).toBe("Berlin");
  });

  it('should handle an empty address object by defaulting to "Berlin"', () => {
    const address = {} as Address;

    // postcodeCity becomes "Berlin", street is undefined
    // Result: "Berlin"
    expect(serializeAddress(address)).toBe("Berlin");
  });
});
