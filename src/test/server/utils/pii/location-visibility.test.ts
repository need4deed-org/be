import { UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { hidePostcodeUnless } from "../../../../server/utils/pii/location-visibility";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

const visibility = (opportunityIds: number[]): CallerVisibility => ({
  userId: 1,
  role: UserRole.VOLUNTEER,
  personIds: new Set(),
  opportunityIds: new Set(opportunityIds),
  agentIds: new Set(),
  matchedAgentIds: new Set(),
  ownerAgentIds: new Set(),
});

describe("hidePostcodeUnless", () => {
  const item = { id: 5, postcode: "10115" };
  const byOpportunity = (v: CallerVisibility) => v.opportunityIds;

  it("keeps the postcode for a privileged caller", () => {
    expect(hidePostcodeUnless(item, null, byOpportunity).postcode).toBe(
      "10115",
    );
  });

  it("keeps the postcode when the caller may see the item", () => {
    expect(
      hidePostcodeUnless(item, visibility([5]), byOpportunity).postcode,
    ).toBe("10115");
  });

  it("hides the postcode otherwise", () => {
    expect(
      hidePostcodeUnless(item, visibility([6]), byOpportunity).postcode,
    ).toBeNull();
  });
});
