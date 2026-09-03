import { UserRole } from "need4deed-sdk";

// The "can see/manage any post or reply at all" gate — ownership on top of
// this is assertCanManagePost's job. Callers decide for themselves whether
// to throw (PATCH/DELETE) or return an empty result (GET, to match this
// codebase's existing not-leaking-existence convention on list endpoints).
export function isPostManagerRole(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.COORDINATOR ||
    role === UserRole.AGENT
  );
}
