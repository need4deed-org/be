import { ApiPersonPatch, PreferredCommunicationType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import Person from "../../../data/entity/person.entity";
import { dtoParsePerson, dtoSerializePerson } from "../../../services/dto"; // Adjust the import path

describe("dtoParsePerson", () => {
  it("should map flat fields and handle preferredCommunicationType as an array", () => {
    const apiPerson: ApiPersonPatch = {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-0123",
      preferredComm: ["email" as PreferredCommunicationType],
    };

    const result = dtoParsePerson(apiPerson);

    expect(result).toEqual({
      firstName: "Jane",
      middleName: undefined,
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-0123",
      avatarUrl: undefined,
      preferredCommunicationType: ["email" as PreferredCommunicationType],
    });
  });

  it("should wrap a single preferredComm value into an array", () => {
    const apiPerson = {
      firstName: "Single",
      preferredComm: "Phone",
    };

    const result = dtoParsePerson(apiPerson as unknown as ApiPersonPatch);

    expect(result.preferredCommunicationType).toEqual(["Phone"]);
  });
});

describe("dtoSerializePerson", () => {
  it("should serialize a full person object correctly", () => {
    const person = {
      id: "user-123",
      firstName: "Jane",
      lastName: "Doe",
      addressId: "addr-456",
      address: {
        street: "123 Main St",
        city: "London",
        postcode: {
          id: "pc-789",
          value: "10115",
          latitude: 52.5,
          longitude: 13.4,
        },
      },
    } as unknown as Person;

    const result = dtoSerializePerson(person);

    expect(result).toEqual({
      id: "user-123",
      firstName: "Jane",
      lastName: "Doe",
      address: {
        id: "addr-456",
        street: "123 Main St",
        city: "London",
        postcode: {
          id: "pc-789",
          code: "10115",
          latitude: 52.5,
          longitude: 13.4,
        },
      },
    });
  });

  it("nulls postcode lat/lon when masked or ungeocoded (be#976: Postcode.latitude/longitude are nullable)", () => {
    const person = {
      id: "user-123",
      address: {
        postcode: {
          id: "pc-789",
          value: "SW1A 1AA",
          latitude: null,
          longitude: null,
        },
      },
    } as unknown as Person;

    const result = dtoSerializePerson(person);

    expect(result.address.postcode.latitude).toBeNull();
    expect(result.address.postcode.longitude).toBeNull();
  });

  it("should handle a person without an address object", () => {
    const person = {
      id: "user-123",
      firstName: "Minimal",
      addressId: "addr-999",
      address: undefined,
    } as unknown as Person;

    const result = dtoSerializePerson(person);

    // The address key still exists, but its sub-properties are undefined
    expect(result.address).toBeDefined();
    expect(result.address.id).toBe("addr-999");
    expect(result.address.street).toBeUndefined();

    // Nested postcode will also exist but with undefined id/code and
    // null lat/lon (getCoordinates' no-postcode default)
    expect(result.address.postcode).toEqual({
      id: undefined,
      code: undefined,
      latitude: null,
      longitude: null,
    });
  });

  it('should correctly map internal "value" to API "code"', () => {
    const person = {
      address: {
        postcode: { value: "90210" },
      },
    } as unknown as Person;

    const result = dtoSerializePerson(person);
    expect(result.address.postcode.code).toBe("90210");
  });
});
