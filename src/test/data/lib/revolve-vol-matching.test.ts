import {
  OpportunityVolunteerStatusType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { resolveVolunteerMatchStatus } from "../../../data/lib";

const { MATCHED, ACTIVE, PENDING, PAST } = OpportunityVolunteerStatusType;
const { NO_MATCHES, PENDING_MATCH, NEEDS_REMATCH } = VolunteerStateMatchType;
const VOLUNTEER_MATCHED = VolunteerStateMatchType.MATCHED;

describe("resolveVolunteerMatchStatus", () => {
  // ─── Rule 1: new volunteer ───────────────────────────────────────────────
  describe("Rule 1 — new volunteer", () => {
    it("returns NO_MATCHES when status is NO_MATCHES and no opportunities", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [])).toBe(NO_MATCHES);
    });

    it("returns NO_MATCHES when status is NO_MATCHES and only past opportunities", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PAST, PAST])).toBe(
        NO_MATCHES,
      );
    });
  });

  // ─── Rule 2: pending opportunities ──────────────────────────────────────
  describe("Rule 2 — pending opportunities", () => {
    it("returns PENDING_MATCH when there is one pending opportunity", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PENDING])).toBe(
        PENDING_MATCH,
      );
    });

    it("returns PENDING_MATCH when there are multiple pending opportunities", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PENDING, PENDING])).toBe(
        PENDING_MATCH,
      );
    });

    it("returns PENDING_MATCH when there are pending and past opportunities", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PENDING, PAST])).toBe(
        PENDING_MATCH,
      );
    });
  });

  // ─── Rules 4 & 5: matched or active opportunities ───────────────────────
  describe("Rules 4 & 5 — matched or active opportunities", () => {
    it("returns MATCHED when there is one matched opportunity", () => {
      expect(resolveVolunteerMatchStatus(PENDING_MATCH, [MATCHED])).toBe(
        VOLUNTEER_MATCHED,
      );
    });

    it("returns MATCHED when there is one active opportunity", () => {
      expect(resolveVolunteerMatchStatus(PENDING_MATCH, [ACTIVE])).toBe(
        VOLUNTEER_MATCHED,
      );
    });

    it("returns MATCHED when there are both matched and active opportunities", () => {
      expect(
        resolveVolunteerMatchStatus(VOLUNTEER_MATCHED, [MATCHED, ACTIVE]),
      ).toBe(VOLUNTEER_MATCHED);
    });

    it("returns MATCHED when there are matched, active, and past opportunities", () => {
      expect(
        resolveVolunteerMatchStatus(VOLUNTEER_MATCHED, [MATCHED, ACTIVE, PAST]),
      ).toBe(VOLUNTEER_MATCHED);
    });

    it("returns MATCHED when there are matched and pending opportunities (matched takes priority)", () => {
      expect(
        resolveVolunteerMatchStatus(PENDING_MATCH, [MATCHED, PENDING]),
      ).toBe(VOLUNTEER_MATCHED);
    });

    it("returns MATCHED when there are active and pending opportunities (active takes priority)", () => {
      expect(
        resolveVolunteerMatchStatus(PENDING_MATCH, [ACTIVE, PENDING]),
      ).toBe(VOLUNTEER_MATCHED);
    });
  });

  // ─── Rule 6: needs rematch ───────────────────────────────────────────────
  describe("Rule 6 — needs rematch", () => {
    it("returns NEEDS_REMATCH when previously PENDING_MATCH and no opportunities left", () => {
      expect(resolveVolunteerMatchStatus(PENDING_MATCH, [])).toBe(
        NEEDS_REMATCH,
      );
    });

    it("returns NEEDS_REMATCH when previously MATCHED and no opportunities left", () => {
      expect(resolveVolunteerMatchStatus(VOLUNTEER_MATCHED, [])).toBe(
        NEEDS_REMATCH,
      );
    });

    it("returns NEEDS_REMATCH when previously MATCHED and only past opportunities remain", () => {
      expect(resolveVolunteerMatchStatus(VOLUNTEER_MATCHED, [PAST, PAST])).toBe(
        NEEDS_REMATCH,
      );
    });

    it("returns NEEDS_REMATCH when previously NEEDS_REMATCH and still no active opportunities", () => {
      expect(resolveVolunteerMatchStatus(NEEDS_REMATCH, [])).toBe(
        NEEDS_REMATCH,
      );
    });

    it("returns NEEDS_REMATCH when previously NEEDS_REMATCH and only past opportunities", () => {
      expect(resolveVolunteerMatchStatus(NEEDS_REMATCH, [PAST])).toBe(
        NEEDS_REMATCH,
      );
    });
  });

  // ─── Priority rules ──────────────────────────────────────────────────────
  describe("priority — matched/active beats pending beats past", () => {
    it("matched beats pending", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PENDING, MATCHED])).toBe(
        VOLUNTEER_MATCHED,
      );
    });

    it("active beats pending", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PENDING, ACTIVE])).toBe(
        VOLUNTEER_MATCHED,
      );
    });

    it("pending beats past", () => {
      expect(resolveVolunteerMatchStatus(NO_MATCHES, [PAST, PENDING])).toBe(
        PENDING_MATCH,
      );
    });
  });
});
