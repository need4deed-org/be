import { describe, expect, it } from "vitest";
import { dtoAgentGetList } from "../../../services";

describe("dtoAgentGetList", () => {
  const mockAgentBase = {
    id: 1,
    title: "Helping Hands",
    type: "NGO",
    activeVolunteers: 10,
    addressId: 101,
    districtId: 201,
  };

  it("should correctly map a complete agent object", () => {
    const fullAgent = {
      ...mockAgentBase,
      address: {
        street: "Main St",
        city: "Berlin",
        postcodeId: 501,
        postcode: { value: "10115" },
      },
      district: {
        title: "Mitte",
      },
    };

    const result = dtoAgentGetList(fullAgent as any);

    expect(result).toEqual({
      id: 1,
      title: "Helping Hands",
      type: "NGO",
      activeVolunteers: 10,
      address: {
        id: 101,
        street: "Main St",
        city: "Berlin",
        postcode: {
          id: 501,
          code: "10115",
          latitude: undefined,
          longitude: undefined,
        },
      },
      district: {
        id: 201,
        title: { de: "Mitte" },
      },
    });
  });

  it("should handle missing optional address and district properties gracefully", () => {
    const sparseAgent = {
      ...mockAgentBase,
      address: undefined,
      district: undefined,
    };

    const result = dtoAgentGetList(sparseAgent as any);

    expect(result.address.street).toBeUndefined();
    expect(result.address.postcode.code).toBeUndefined();
    expect(result.district.title.de).toBeUndefined();

    // Ensure IDs (which come from the root agent object) still map
    expect(result.address.id).toBe(101);
    expect(result.district.id).toBe(201);
  });

  it("should always set latitude and longitude to undefined", () => {
    // The implementation explicitly sets these to undefined
    const result = dtoAgentGetList(mockAgentBase as any);

    expect(result.address.postcode.latitude).toBeUndefined();
    expect(result.address.postcode.longitude).toBeUndefined();
  });
});
