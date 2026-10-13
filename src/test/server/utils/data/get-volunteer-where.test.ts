import { UserRole } from "need4deed-sdk";
import { ILike, In, IsNull } from "typeorm";
import { describe, expect, it } from "vitest";
import {
  getVolunteerFilterWhere,
  getVolunteerWhere,
} from "../../../../server/utils/data/get-volunteer-where";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

function visibility(
  personIds: number[],
  ownerAgentIds: number[] = [],
): CallerVisibility {
  return {
    userId: 1,
    role: UserRole.AGENT,
    personIds: new Set(personIds),
    opportunityIds: new Set(),
    agentIds: new Set(),
    matchedAgentIds: new Set(),
    ownerAgentIds: new Set(ownerAgentIds),
  };
}

describe("getVolunteerWhere search (be#666, be#972)", () => {
  it("matches name/email across all persons for a privileged caller", () => {
    expect(getVolunteerFilterWhere({ search: "ann" }, null)).toEqual({
      person: [
        { firstName: ILike("%ann%") },
        { lastName: ILike("%ann%") },
        { email: ILike("%ann%") },
        { phone: ILike("%ann%") },
      ],
    });
  });

  it("scopes each search branch to persons visible to a masked caller", () => {
    expect(
      getVolunteerFilterWhere({ search: "ann" }, visibility([7, 9])),
    ).toEqual({
      person: [
        { firstName: ILike("%ann%"), id: In([7, 9]) },
        { lastName: ILike("%ann%"), id: In([7, 9]) },
        { email: ILike("%ann%"), id: In([7, 9]) },
        { phone: ILike("%ann%"), id: In([7, 9]) },
      ],
    });
  });

  it("matches nothing for a masked caller who can see no person", () => {
    expect(getVolunteerFilterWhere({ search: "ann" }, visibility([]))).toEqual({
      person: [
        { firstName: ILike("%ann%"), id: In([-1]) },
        { lastName: ILike("%ann%"), id: In([-1]) },
        { email: ILike("%ann%"), id: In([-1]) },
        { phone: ILike("%ann%"), id: In([-1]) },
      ],
    });
  });

  it("escapes LIKE metacharacters in filter.search", () => {
    const where = getVolunteerFilterWhere({ search: "a_b%" }, null);
    expect(where.person?.[0]).toEqual({ firstName: ILike("%a\\_b\\%%") });
  });

  describe("formatting-insensitive phone match", () => {
    const phoneDigitsBranch = (search: string) =>
      getVolunteerFilterWhere({ search }, null).person?.[4] as
        | { phone: { _type: string; _objectLiteralParameters: unknown } }
        | undefined;

    it.each(["+4930123", "+49 (30) 123-4", "030/123.45"])(
      "adds a digits-only phone branch for phone-like input %j",
      (search) => {
        const branch = phoneDigitsBranch(search);
        expect(branch?.phone._type).toBe("raw");
        expect(branch?.phone._objectLiteralParameters).toEqual({
          phoneDigits: `%${search.replace(/\D/g, "")}%`,
        });
      },
    );

    it.each(["ann", "Ann 030", "12", "+ -"])(
      "adds no digits-only phone branch for %j",
      (search) => {
        expect(phoneDigitsBranch(search)).toBeUndefined();
      },
    );

    it("scopes the phone branch to visible persons too", () => {
      const where = getVolunteerFilterWhere(
        { search: "030 123" },
        visibility([7]),
      );
      expect(where.person?.[4]).toMatchObject({ id: In([7]) });
    });
  });

  it("does not scope a masked caller's query without a search", () => {
    expect(
      getVolunteerFilterWhere({ district: ["3"] }, visibility([])),
    ).toEqual({
      deal: { dealDistrict: { district: { id: In(["3"]) } } },
    });
  });
});

describe("getVolunteerWhere owner scoping (be#1056)", () => {
  it("adds no owner condition for a privileged caller", () => {
    expect(getVolunteerWhere({}, null)).toEqual({});
  });

  it("filters a privileged caller by ownerAgent", () => {
    expect(getVolunteerWhere({ ownerAgent: ["4"] }, null)).toEqual({
      ownerAgentId: In([4]),
    });
  });

  it("shows platform volunteers, visible owners and visible persons", () => {
    expect(getVolunteerWhere({}, visibility([7], [4, 5]))).toEqual([
      { ownerAgentId: IsNull() },
      { ownerAgentId: In([4, 5]) },
      { personId: In([7]) },
    ]);
  });

  it("shows only platform volunteers when nothing else is visible", () => {
    expect(getVolunteerWhere({}, visibility([]))).toEqual([
      { ownerAgentId: IsNull() },
    ]);
  });

  it("limits ownerAgent to owners the caller may see", () => {
    expect(
      getVolunteerWhere({ ownerAgent: ["4", "9"] }, visibility([], [4])),
    ).toEqual([{ ownerAgentId: In([4]) }]);
  });

  it("matches nothing for an ownerAgent the caller may not see", () => {
    expect(getVolunteerWhere({ ownerAgent: "9" }, visibility([], [4]))).toEqual(
      { id: In([-1]) },
    );
  });
});
