import { UserRole } from "need4deed-sdk";
import { ILike, In } from "typeorm";
import { describe, expect, it } from "vitest";
import {
  getVolunteerFilterWhere,
  getVolunteerWhere,
} from "../../../../server/utils/data/get-volunteer-where";
import { CallerVisibility } from "../../../../server/utils/pii/visible-persons";

function visibility(
  personIds: number[],
  ownerAgentIds: number[] = [],
  agentIds: number[] = [],
): CallerVisibility {
  return {
    userId: 1,
    role: UserRole.AGENT,
    personIds: new Set(personIds),
    opportunityIds: new Set(),
    agentIds: new Set(agentIds),
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

  type RawScope = {
    _type: string;
    _getSql: (alias: string) => string;
    _objectLiteralParameters: Record<string, unknown>;
  };
  const scopes = (where: object) =>
    ((where as { person?: { id: RawScope }[] }).person ?? []).map((b) => b.id);

  it("scopes each search branch to persons visible to a masked caller", () => {
    const where = getVolunteerFilterWhere(
      { search: "ann" },
      visibility([7, 9], [], [4]),
    );
    expect(where).toMatchObject({
      person: [
        { firstName: ILike("%ann%") },
        { lastName: ILike("%ann%") },
        { email: ILike("%ann%") },
        { phone: ILike("%ann%") },
      ],
    });
    const branchScopes = scopes(where);
    expect(branchScopes).toHaveLength(4);
    for (const scope of branchScopes) {
      expect(scope._getSql("p.id")).toBe(
        "(p.id = ANY(:scopePersons) OR p.id IN (SELECT person_id FROM volunteer WHERE owner_agent_id = ANY(:scopeAgents)))",
      );
      expect(scope._objectLiteralParameters).toEqual({
        scopePersons: [7, 9],
        scopeAgents: [4],
      });
    }
  });

  it("matches nothing for a masked caller who can see no person", () => {
    const [scope] = scopes(
      getVolunteerFilterWhere({ search: "ann" }, visibility([])),
    );
    expect(scope._objectLiteralParameters).toEqual({
      scopePersons: [],
      scopeAgents: [],
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
      expect(
        (where.person as unknown as { id: RawScope }[])[4].id
          ._objectLiteralParameters,
      ).toMatchObject({ scopePersons: [7] });
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
  type RawCondition = {
    _type: string;
    _getSql: (alias: string) => string;
    _objectLiteralParameters: Record<string, unknown>;
  };
  const condition = (where: object, key: "ownerAgentId" | "id") =>
    (where as Record<string, RawCondition | undefined>)[key];
  const COLUMN = "Volunteer.ownerAgentId";

  it("adds no owner condition for a privileged caller without a filter", () => {
    expect(getVolunteerWhere({}, null)).toEqual({});
  });

  it("filters a privileged caller by ownerAgent, incl. none", () => {
    const owner = condition(
      getVolunteerWhere({ ownerAgent: ["4", "none"] }, null),
      "ownerAgentId",
    );
    expect(owner?._getSql(COLUMN)).toBe(
      `(${COLUMN} IS NULL OR ${COLUMN} = ANY(:requestedOwners))`,
    );
    expect(owner?._objectLiteralParameters.requestedOwners).toEqual([4]);
  });

  it("limits a masked caller to no owner, visible owners or visible persons", () => {
    const where = getVolunteerWhere({}, visibility([7], [4, 5]));
    expect(condition(where, "ownerAgentId")).toBeUndefined();
    const scope = condition(where, "id");
    expect(scope?._getSql("Volunteer.id")).toBe(
      "Volunteer.id IN (SELECT id FROM volunteer WHERE owner_agent_id IS NULL OR owner_agent_id = ANY(:visibleOwners) OR person_id = ANY(:visiblePersons))",
    );
    expect(scope?._objectLiteralParameters).toEqual({
      visibleOwners: [4, 5],
      visiblePersons: [7],
    });
  });

  it("ANDs a requested owner with the caller's visibility", () => {
    const where = getVolunteerWhere({ ownerAgent: "9" }, visibility([], [4]));
    expect(
      condition(where, "ownerAgentId")?._objectLiteralParameters
        .requestedOwners,
    ).toEqual([9]);
    expect(condition(where, "id")?._objectLiteralParameters).toMatchObject({
      visibleOwners: [4],
    });
  });
});
