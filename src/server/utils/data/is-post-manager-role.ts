import { UserRole } from "need4deed-sdk";

export function isPostManagerRole(role: UserRole | undefined): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.COORDINATOR ||
    role === UserRole.AGENT
  );
}
