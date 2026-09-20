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
});
