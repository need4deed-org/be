import { UserRole } from "need4deed-sdk";
import { describe, expect, it } from "vitest";
import { isStaffRole } from "../../../../server/utils/data/is-staff-role";

describe("isStaffRole", () => {
  it("is true only for coordinator and admin", () => {
    expect(isStaffRole(UserRole.COORDINATOR)).toBe(true);
    expect(isStaffRole(UserRole.ADMIN)).toBe(true);
    expect(isStaffRole(UserRole.AGENT)).toBe(false);
    expect(isStaffRole(UserRole.VOLUNTEER)).toBe(false);
    expect(isStaffRole(UserRole.USER)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});
