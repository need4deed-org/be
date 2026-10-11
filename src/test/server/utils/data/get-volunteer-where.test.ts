import { UserRole } from "need4deed-sdk";
import { ILike, In } from "typeorm";
import { describe, expect, it } from "vitest";
import { getVolunteerWhere } from "../../../../server/utils/data/get-volunteer-where";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

function visibility(personIds: number[]): CallerVisibility {
  return {
    userId: 1,
    role: UserRole.VOLUNTEER,
    personIds: new Set(personIds),
    opportunityIds: new Set(),
    agentIds: new Set(),
    matchedAgentIds: new Set(),
  };
}

describe("getVolunteerWhere search (be#666, be#972)", () => {
  it("matches name/email across all persons for a privileged caller", () => {
    expect(getVolunteerWhere({ search: "ann" }, null)).toEqual({
      person: [
        { firstName: ILike("%ann%") },
        { lastName: ILike("%ann%") },
        { email: ILike("%ann%") },
        { phone: ILike("%ann%") },
      ],
    });
  });

  it("scopes each search branch to persons visible to a masked caller", () => {
    expect(getVolunteerWhere({ search: "ann" }, visibility([7, 9]))).toEqual({
      person: [
        { firstName: ILike("%ann%"), id: In([7, 9]) },
        { lastName: ILike("%ann%"), id: In([7, 9]) },
        { email: ILike("%ann%"), id: In([7, 9]) },
        { phone: ILike("%ann%"), id: In([7, 9]) },
      ],
    });
  });

  it("matches nothing for a masked caller who can see no person", () => {
    expect(getVolunteerWhere({ search: "ann" }, visibility([]))).toEqual({
      person: [
        { firstName: ILike("%ann%"), id: In([-1]) },
        { lastName: ILike("%ann%"), id: In([-1]) },
        { email: ILike("%ann%"), id: In([-1]) },
        { phone: ILike("%ann%"), id: In([-1]) },
      ],
    });
  });

  it("escapes LIKE metacharacters in filter.search", () => {
    const where = getVolunteerWhere({ search: "a_b%" }, null);
    expect(where.person?.[0]).toEqual({ firstName: ILike("%a\\_b\\%%") });
  });

  it("does not scope a masked caller's query without a search", () => {
    expect(getVolunteerWhere({ district: ["3"] }, visibility([]))).toEqual({
      deal: { dealDistrict: { district: { id: In(["3"]) } } },
    });
  });
});
