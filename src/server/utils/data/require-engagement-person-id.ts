import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import { isPostManagerRole } from "./is-post-manager-role";
import { requireLinkedPersonId } from "./require-linked-person-id";

export function requireEngagementPersonId(
  role: UserRole | undefined,
  personId: number | undefined,
): number {
  if (!isPostManagerRole(role)) {
    throw new UnauthorizedError("Permission denied.");
  }
  return requireLinkedPersonId(personId);
}
