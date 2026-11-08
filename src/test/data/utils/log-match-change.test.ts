import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { matchDetail } from "../../../data/utils/log-match-change";

const { PENDING, MATCHED, ACTIVE, PAST } = OpportunityVolunteerStatusType;

// fe parses these exact sentences (fe parse-match-detail.ts); change both together.
describe("matchDetail sentences", () => {
  it("linked", () => {
    expect(matchDetail.linked("Kleiderkammer", MATCHED)).toBe(
      'Linked to opportunity "Kleiderkammer" as opp-matched.',
    );
    expect(matchDetail.linked("Kleiderkammer")).toBe(
      'Linked to opportunity "Kleiderkammer".',
    );
    expect(matchDetail.linked("Kleiderkammer", ACTIVE, true)).toBe(
      'Linked to opportunity "Kleiderkammer" as opp-active (imported).',
    );
    expect(matchDetail.linked("Kleiderkammer", undefined, true)).toBe(
      'Linked to opportunity "Kleiderkammer" (imported).',
    );
    expect(matchDetail.linkedPrefix("Kleiderkammer")).toBe(
      'Linked to opportunity "Kleiderkammer"',
    );
  });

  it("removed", () => {
    expect(matchDetail.removed("Kleiderkammer", PAST)).toBe(
      'Removed from opportunity "Kleiderkammer" (was opp-past).',
    );
  });

  it("status changed", () => {
    expect(
      matchDetail.statusChanged("Kleiderkammer", {
        from: PENDING,
        to: MATCHED,
      }),
    ).toBe(
      'Opportunity "Kleiderkammer" status changed from opp-pending to opp-matched.',
    );
    expect(matchDetail.statusChanged("Kleiderkammer", { to: ACTIVE })).toBe(
      'Opportunity "Kleiderkammer" status changed to opp-active.',
    );
  });

  it("title fallback", () => {
    expect(matchDetail.title(null, 13)).toBe("#13");
    expect(matchDetail.title(undefined, 13)).toBe("#13");
    expect(matchDetail.title("Kleiderkammer", 13)).toBe("Kleiderkammer");
  });

  it("status ids keep the opp-<kebab> shape fe matches", () => {
    for (const status of Object.values(OpportunityVolunteerStatusType)) {
      expect(status).toMatch(/^opp-[a-z-]+$/);
    }
  });
});
