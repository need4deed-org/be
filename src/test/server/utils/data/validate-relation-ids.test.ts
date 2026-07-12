import { describe, expect, it } from "vitest";
import { BadRequestError } from "../../../../config";
import { validateRelationIds } from "../../../../server/utils/data/validate-relation-ids";

describe("validateRelationIds", () => {
  it("does not throw when all requested ids are found", () => {
    expect(() =>
      validateRelationIds(
        [1, 2, 3],
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        "person",
      ),
    ).not.toThrow();
  });

  it("throws BadRequestError when any id is missing", () => {
    expect(() => validateRelationIds([1, 2, 3], [{ id: 1 }], "person")).toThrow(
      BadRequestError,
    );
  });

  it("includes the label and missing ids in the error message", () => {
    expect(() =>
      validateRelationIds([1, 2, 3], [{ id: 1 }], "tagged person"),
    ).toThrow("Invalid tagged person id(s): 2, 3");
  });

  it("deduplicates requested ids before checking", () => {
    expect(() =>
      validateRelationIds([1, 1, 2], [{ id: 1 }, { id: 2 }], "person"),
    ).not.toThrow();
  });

  it("does not throw when requestedIds is empty", () => {
    expect(() => validateRelationIds([], [], "person")).not.toThrow();
  });
});
