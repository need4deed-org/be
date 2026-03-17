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

  it("should map address without postcode correctly", () => {
    const apiPerson = {
      firstName: "John",
      address: {
        street: "123 Main St",
        city: "Tech City",
      },
    };

    const result = dtoParsePerson(apiPerson as ApiPersonPatch);

    expect(result.address).toEqual({
      street: "123 Main St",
      city: "Tech City",
    });
    expect(result.address).not.toHaveProperty("postcode");
  });

  it("should map the full object including nested postcode", () => {
    const apiPerson = {
      firstName: "Alice",
      address: {
        street: "456 Oak Ave",
        city: "Berlin",
        postcode: {
          id: "pc_123",
          code: "10115",
        },
      },
    };

    const result = dtoParsePerson(apiPerson as unknown as ApiPersonPatch);

    expect(result.address?.postcode).toEqual({
      id: "pc_123",
      value: "10115",
    });
  });

  it("should not include an address key if apiPerson.address is undefined", () => {
    const apiPerson = { firstName: "Bob" };
    const result = dtoParsePerson(apiPerson as ApiPersonPatch);

    expect(result).not.toHaveProperty("address");
  });

  it("should handle partial address fields", () => {
    const apiPerson = {
      address: {
        street: "Lone Street",
      },
    };

    const result = dtoParsePerson(apiPerson as ApiPersonPatch);

    expect(result.address).toBeDefined();
    expect(result.address?.street).toBe("Lone Street");
    expect(result.address?.city).toBeUndefined();
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
          value: "SW1A 1AA",
          latitude: 51.5,
          longitude: -0.1,
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
          code: "SW1A 1AA", // Mapping value -> code
          latitude: 51.5,
          longitude: -0.1,
        },
      },
    });
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

    // Nested postcode will also exist but with undefined values
    expect(result.address.postcode).toEqual({
      id: undefined,
      code: undefined,
      latitude: undefined,
      longitude: undefined,
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
