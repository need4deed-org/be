import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import { isPostManagerRole } from "./is-post-manager-role";
import { requireLinkedPersonId } from "./require-linked-person-id";

// Shared by all four reaction endpoints: same eligibility rule (anything
// that can view posts can react to them) as well as the linked-person
// requirement.
export function requireReactorPersonId(
  role: UserRole,
  personId: number | undefined,
): number {
  if (!isPostManagerRole(role)) {
    throw new UnauthorizedError("Permission denied.");
  }
  return requireLinkedPersonId(personId);
}
