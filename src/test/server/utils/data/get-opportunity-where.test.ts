import { In } from "typeorm";
import { describe, expect, it } from "vitest";
import { QuerystringOpportunityFiltering } from "../../../../server/types";
import { getOpportunityWhere } from "../../../../server/utils";

describe("getOpportunityWhere", () => {
  it("returns an empty object when no filters are provided", () => {
    expect(getOpportunityWhere(undefined)).toEqual({});
  });

  it("keeps every deal constraint when several are combined", () => {
    const where = getOpportunityWhere({
      type: "",
      status: "",
      language: "1",
      district: "2",
      activity: "3",
      skill: "4",
    });

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: "1" } },
      dealDistrict: { district: { id: "2" } },
      dealActivity: { activity: { id: "3" } },
      dealSkill: { skill: { id: "4" } },
    });
  });

  // Multiple selections arrive as an array at runtime (?language=3&language=4)
  // and become In([...]), which TypeORM ORs. The querystring type declares
  // every filter as `string`, hence the cast, see the
  // `// TODO: what about arrays?` above QuerystringOpportunityFiltering.
  it("ORs multiple values within a single filter", () => {
    const where = getOpportunityWhere({
      type: "",
      status: "",
      language: ["3", "4"],
    } as unknown as QuerystringOpportunityFiltering["filter"]);

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: In(["3", "4"]) } },
    });
  });

  it("applies only the language constraint when nothing else is selected", () => {
    const where = getOpportunityWhere({ type: "", status: "", language: "3" });

    expect(where.deal).toEqual({
      dealLanguage: { language: { id: "3" } },
    });
  });
});
