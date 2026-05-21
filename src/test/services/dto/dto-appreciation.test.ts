import { describe, expect, it } from "vitest";
import { dtoAppreciation } from "../../../services/dto/dto-appreciation";

describe("dtoAppreciation", () => {
  const base = {
    id: 1,
    title: "T-shirt",
    dateDue: new Date("2025-01-01"),
    dateDelivery: new Date("2025-02-01"),
    volunteerId: 10,
    opportunityId: 20,
    userId: 5,
  };

  it("maps all fields from the entity", () => {
    const result = dtoAppreciation(base as any);
    expect(result).toEqual({
      id: 1,
      title: "T-shirt",
      dateDue: base.dateDue,
      dateDelivery: base.dateDelivery,
      volunteerId: 10,
      opportunityId: 20,
      userId: 5,
    });
  });

  it("passes through null/undefined optional fields", () => {
    const result = dtoAppreciation({
      ...base,
      dateDue: undefined,
      dateDelivery: undefined,
      opportunityId: undefined,
      userId: undefined,
    } as any);
    expect(result.dateDue).toBeUndefined();
    expect(result.dateDelivery).toBeUndefined();
    expect(result.opportunityId).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });
});
