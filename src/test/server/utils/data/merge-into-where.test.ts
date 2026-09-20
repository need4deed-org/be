import { In } from "typeorm";
import { describe, expect, it } from "vitest";
import { mergeIntoWhere } from "../../../../server/utils/data/merge-into-where";

// mergeIntoWhere is generic over the entity's FindOptionsWhere shape, but
// the OR-array case (be#1018) mixes branches with different keys — a
// realistic where clause, but not one shape a single FindOptionsWhere<T>
// literal type-checks against. Record<string, unknown> sidesteps that
// without weakening what the function itself guarantees.
type Where = Record<string, unknown>;

describe("mergeIntoWhere", () => {
  it("merges the extra condition into a single-object where", () => {
    const where: Where = { status: "active" };

    mergeIntoWhere(where, { agentId: In([1, 2]) });

    expect(where).toEqual({ status: "active", agentId: In([1, 2]) });
  });

  // be#1018: a filter-builder can return an array of alternative
  // FindOptionsWhere (one per OR branch). A scoping condition applied on
  // top must AND onto every branch, or a scoped caller would see rows that
  // only match through an unscoped branch.
  it("merges the extra condition onto every branch of an array where", () => {
    const where: Where[] = [
      { districtId: "2" },
      { deal: { dealDistrict: {} } },
    ];

    mergeIntoWhere(where, { agentId: In([1, 2]) });

    expect(where).toEqual([
      { districtId: "2", agentId: In([1, 2]) },
      { deal: { dealDistrict: {} }, agentId: In([1, 2]) },
    ]);
  });

  it("overwrites a key the extra condition also sets, on every branch", () => {
    const where: Where[] = [{ agentId: In([9]) }, { agentId: In([9]) }];

    mergeIntoWhere(where, { agentId: In([1, 2]) });

    expect(where).toEqual([{ agentId: In([1, 2]) }, { agentId: In([1, 2]) }]);
  });

  // be#1022 review: a shallow Object.assign would silently drop an existing
  // nested constraint (e.g. deal.dealDistrict) whenever the extra condition
  // also sets `deal` — the same "silently dropped constraint" bug class
  // be#1018 fixed, just one level up.
  it("deep-merges a shared key that's a plain object on both sides, instead of overwriting it", () => {
    const where: Where = {
      deal: { dealDistrict: { district: { id: "2" } } },
    };

    mergeIntoWhere(where, {
      deal: { dealLanguage: { language: { id: "9" } } },
    });

    expect(where).toEqual({
      deal: {
        dealDistrict: { district: { id: "2" } },
        dealLanguage: { language: { id: "9" } },
      },
    });
  });

  it("still lets the extra condition overwrite a FindOperator under a shared key, instead of trying to merge into it", () => {
    const where: Where = {
      deal: { dealLanguage: { language: { id: In(["1"]) } } },
    };

    mergeIntoWhere(where, {
      deal: { dealLanguage: { language: { id: In(["2"]) } } },
    });

    expect(where).toEqual({
      deal: { dealLanguage: { language: { id: In(["2"]) } } },
    });
  });
});
