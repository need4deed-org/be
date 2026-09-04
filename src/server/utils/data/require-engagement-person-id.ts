import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import { isPostManagerRole } from "./is-post-manager-role";
import { requireLinkedPersonId } from "./require-linked-person-id";

// Shared by reaction and bookmark endpoints: same eligibility rule (anything
// that can view posts can react to/bookmark them) as well as the
// linked-person requirement.
export function requireEngagementPersonId(
  role: UserRole,
  personId: number | undefined,
): number {
  if (!isPostManagerRole(role)) {
    throw new UnauthorizedError("Permission denied.");
  }
  return requireLinkedPersonId(personId);
}
