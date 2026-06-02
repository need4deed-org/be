import { UserRole } from "need4deed-sdk";
import { ILike } from "typeorm";
import { describe, expect, it } from "vitest";
import { getUserWhere } from "../../../../server/utils/data/get-user-where";

describe("getUserWhere", () => {
  it("returns an empty object when neither search nor role is provided", () => {
    expect(getUserWhere()).toEqual({});
  });

  it("returns just `role` when only role is provided", () => {
    expect(getUserWhere(undefined, UserRole.COORDINATOR)).toEqual({
      role: UserRole.COORDINATOR,
    });
  });

  it("returns ILIKE OR-clauses on person name columns when only search is provided", () => {
    const where = getUserWhere("Alice");
    expect(where).toEqual({
      person: [
        { firstName: ILike("%Alice%") },
        { middleName: ILike("%Alice%") },
        { lastName: ILike("%Alice%") },
      ],
    });
  });

  it("combines role + search at the top level (AND semantics in TypeORM)", () => {
    const where = getUserWhere("Bob", UserRole.AGENT);
    expect(where).toEqual({
      role: UserRole.AGENT,
      person: [
        { firstName: ILike("%Bob%") },
        { middleName: ILike("%Bob%") },
        { lastName: ILike("%Bob%") },
      ],
    });
  });
});
