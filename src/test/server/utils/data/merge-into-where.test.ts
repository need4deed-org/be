import { And, Equal, In, Raw } from "typeorm";
import { describe, expect, it } from "vitest";
import {
  andIntoWhere,
  mergeIntoWhere,
} from "../../../../server/utils/data/merge-into-where";

type Where = Record<string, unknown>;

describe("mergeIntoWhere", () => {
  it("merges the extra condition into a single-object where", () => {
    const where: Where = { status: "active" };

    mergeIntoWhere(where, { agentId: In([1, 2]) });

    expect(where).toEqual({ status: "active", agentId: In([1, 2]) });
  });

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

describe("andIntoWhere", () => {
  const extra = Raw((alias) => `${alias} > 0`);

  it("sets the key where a branch has none", () => {
    const where: Where[] = [{ status: "active" }, { title: "x" }];

    andIntoWhere(where, "id", extra);

    expect(where).toEqual([
      { status: "active", id: extra },
      { title: "x", id: extra },
    ]);
  });

  it("ANDs onto an existing operator or plain value instead of overwriting it", () => {
    const search = Raw((alias) => `${alias} IN (1)`);
    const where: Where[] = [{ id: search }, { id: 7 }];

    andIntoWhere(where, "id", extra);

    expect(where).toEqual([
      { id: And(search, extra) },
      { id: And(Equal(7), extra) },
    ]);
  });
});
