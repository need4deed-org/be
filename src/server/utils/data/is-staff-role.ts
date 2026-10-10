import { UserRole } from "need4deed-sdk";

export const STAFF_ROLES: readonly UserRole[] = [
  UserRole.COORDINATOR,
  UserRole.ADMIN,
];

export function isStaffRole(role: UserRole | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role);
}
