/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { dtoOpportunityOtherGetList } from "../../../services/dto/dto-opportunity-other";

describe("dtoOpportunityOtherGetList", () => {
  const agent = { districtId: 9, district: { title: "Mitte" } };

  it("falls back to the NGO's district without an own address", () => {
    const result = dtoOpportunityOtherGetList({ id: 1, agent } as any);
    expect(result.district).toEqual({ id: 9, title: { de: "Mitte" } });
  });

  it("never falls back to the NGO's district with an own address", () => {
    const result = dtoOpportunityOtherGetList({
      id: 1,
      addressId: 3,
      agent,
    } as any);
    expect(result.district).toBeNull();
  });
});
