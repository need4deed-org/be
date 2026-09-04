import { UserRole } from "need4deed-sdk";
import {
  BadRequestError,
  UnauthorizedError,
} from "../../../config/error/fastify";
import { isPostManagerRole } from "./is-post-manager-role";

// Shared by all four reaction endpoints: same eligibility rule (anything
// that can view posts can react to them) and the same "must have a linked
// person" requirement every mutation in this file needs.
export function requireReactorPersonId(
  role: UserRole,
  personId: number | undefined,
): number {
  if (!isPostManagerRole(role)) {
    throw new UnauthorizedError("Permission denied.");
  }
  if (!personId) {
    throw new BadRequestError("No person linked to this user.");
  }
  return personId;
}
