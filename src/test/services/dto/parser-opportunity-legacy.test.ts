import { OpportunityLegacyFormData, OpportunityType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { parseOpportunityLegacy } from "../../../services/dto/parser-opportunity-legacy";

vi.mock("../../../data/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../data/utils")>()),
  getDistrictFromPostcode: vi.fn().mockResolvedValue(undefined),
  getDistrictByTitle: vi.fn().mockResolvedValue(undefined),
}));

const baseBody = {
  title: "Hospital visit",
  volunteers_number: 1,
  vo_information: "Please bring a translator.",
} as unknown as OpportunityLegacyFormData;

describe("parseOpportunityLegacy", () => {
  it("mirrors the description into both info and infoConfidential for ACCOMPANYING type", async () => {
    const body = {
      ...baseBody,
      opportunity_type: "accompanying",
      accomp_postcode: "10115",
      accomp_information: null,
    } as unknown as OpportunityLegacyFormData;

    const opportunity = await parseOpportunityLegacy(body);

    expect(opportunity.type).toBe(OpportunityType.ACCOMPANYING);
    expect(opportunity.info).toBe("Please bring a translator.");
    expect(opportunity.infoConfidential).toBe("Please bring a translator.");
  });

  it("leaves infoConfidential sourced from accomp_information for non-ACCOMPANYING types", async () => {
    const body = {
      ...baseBody,
      opportunity_type: "regular",
      accomp_information: "should not be used as description",
    } as unknown as OpportunityLegacyFormData;

    const opportunity = await parseOpportunityLegacy(body);

    expect(opportunity.type).toBe(OpportunityType.REGULAR);
    expect(opportunity.info).toBe("Please bring a translator.");
    expect(opportunity.infoConfidential).toBe(
      "should not be used as description",
    );
  });
});
