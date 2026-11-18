import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import { describe, expect, it } from "vitest";
import {
  getVolunteerFilterWhere,
  getVolunteerWhere,
  normalizeVolunteerStatusFilter,
} from "../../../../server/utils/data/get-volunteer-where";
import { getVolunteerSearchFragment } from "../../../../server/utils/data/volunteer-search";
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

describe("volunteer search", () => {
  it("normalizes frontend engagement and match status filters", () => {
    expect(normalizeVolunteerStatusFilter("new")).toBe("vol-new");
    expect(normalizeVolunteerStatusFilter(["new", "vol-active"])).toEqual([
      "vol-new",
      "vol-active",
    ]);
    expect(normalizeVolunteerStatusFilter(undefined)).toBeUndefined();
  });

  it("matches person fields, deal options, owner NGO and notes for a privileged caller", () => {
    const { sql, params } = getVolunteerSearchFragment("ann", null);
    for (const part of [
      "NULLIF(p.last_name, '')) ILIKE :searchPattern",
      "p.phone ILIKE :searchPattern",
      "JOIN language o",
      "JOIN skill o",
      "JOIN activity o",
      "JOIN district o",
      "a.id = v.owner_agent_id",
      "v.info_about ILIKE :searchPattern",
    ]) {
      expect(sql).toContain(part);
    }
    expect(sql).not.toContain(":searchPersonIds");
    expect(params.searchPattern).toBe("%ann%");
  });

  it("scopes person fields to visible persons and skips notes for a masked caller", () => {
    const { sql, params } = getVolunteerSearchFragment(
      "ann",
      visibility([7, 9]),
    );
    expect(sql).toContain("p.id = ANY(:searchPersonIds) AND (");
    expect(sql).not.toContain("info_about");
    expect(params.searchPersonIds).toEqual([7, 9]);
  });

  it("escapes LIKE metacharacters", () => {
    expect(getVolunteerSearchFragment("a_b%", null).params.searchPattern).toBe(
      "%a\\_b\\%%",
    );
  });

  it.each(["+4930123", "+49 (30) 123-4", "030/123.45"])(
    "adds a digits-only phone match for %j",
    (search) => {
      const { sql, params } = getVolunteerSearchFragment(search, null);
      expect(sql).toContain("LIKE :searchDigits");
      expect(params.searchDigits).toBe(`%${search.replace(/\D/g, "")}%`);
    },
  );

  it.each(["ann", "Ann 030", "12", "+ -"])(
    "adds no digits-only phone match for %j",
    (search) => {
      expect(getVolunteerSearchFragment(search, null).sql).not.toContain(
        ":searchDigits",
      );
    },
  );

  it("ANDs the search with a masked caller's visibility", () => {
    const where = getVolunteerWhere({ search: "ann" }, visibility([7], [4]));
    const id = (
      where as unknown as {
        id?: { _type: string; _value: { _getSql: (a: string) => string }[] };
      }
    ).id;
    expect(id?._type).toBe("and");
    const [search, scope] = id?._value ?? [];
    expect(search._getSql("Volunteer.id")).toContain("NULLIF(p.first_name");
    expect(scope._getSql("Volunteer.id")).toContain("owner_agent_id IS NULL");
  });

  it("keeps filters without a search on the deal", () => {
    expect(getVolunteerFilterWhere({ district: ["3"] })).toEqual({
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
