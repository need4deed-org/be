import { UserRole } from "need4deed-sdk";
import { FindOperator } from "typeorm";
import { describe, expect, it } from "vitest";
import { getUserWhere } from "../../../../server/utils/data/get-user-where";

function rawSql(operator: unknown): string {
  expect(operator).toBeInstanceOf(FindOperator);
  const raw = operator as FindOperator<unknown>;
  expect(raw.type).toBe("raw");
  return (raw.getSql as (alias: string) => string)("User.id");
}

describe("getUserWhere", () => {
  it("returns an empty object when neither search nor role is provided", () => {
    expect(getUserWhere()).toEqual({});
  });

  it("ignores a whitespace-only search", () => {
    expect(getUserWhere("   ")).toEqual({});
  });

  it("returns just `role` when only role is provided", () => {
    expect(getUserWhere(undefined, UserRole.COORDINATOR)).toEqual({
      role: UserRole.COORDINATOR,
    });
  });

  it("matches every word against email or full name", () => {
    const where = getUserWhere("  Anna  Müller ");
    expect(Object.keys(where)).toEqual(["id"]);
    const sql = rawSql(where.id);
    expect(sql).toContain('User.id IN (SELECT u.id FROM "public"."user" u');
    expect(sql).toContain(
      "(u.email ILIKE :userSearch0 OR CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.middle_name, ''), NULLIF(p.last_name, '')) ILIKE :userSearch0) AND (u.email ILIKE :userSearch1",
    );
    expect((where.id as FindOperator<unknown>).objectLiteralParameters).toEqual(
      { userSearch0: "%Anna%", userSearch1: "%Müller%" },
    );
  });

  it("escapes LIKE wildcards", () => {
    const where = getUserWhere("a_b%c");
    expect((where.id as FindOperator<unknown>).objectLiteralParameters).toEqual(
      { userSearch0: "%a\\_b\\%c%" },
    );
  });

  it("combines role + search at the top level (AND semantics in TypeORM)", () => {
    const where = getUserWhere("Bob", UserRole.AGENT);
    expect(where.role).toBe(UserRole.AGENT);
    rawSql(where.id);
  });
});
