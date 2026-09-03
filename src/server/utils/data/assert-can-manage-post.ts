import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";

// Deliberately not `validatePermissions()` from `../common` — that helper
// compares against `entity.userId === request.user.id` (User account id),
// while `Post`/reply ownership is keyed on `authorId`, a Person id
// (`request.authUser?.personId`). Post and User/Person are different id
// spaces in this codebase; comparing across them would be a real bug, not
// just a naming difference.
export function assertCanManagePost(params: {
  authorId: number;
  requestPersonId: number | undefined;
  role: UserRole;
  action: "edit" | "delete";
  resource: "posts" | "replies";
}): void {
  const { authorId, requestPersonId, role, action, resource } = params;
  const isAuthor = requestPersonId === authorId;
  const isPrivileged = role === UserRole.ADMIN || role === UserRole.COORDINATOR;
  if (!isAuthor && !isPrivileged) {
    throw new UnauthorizedError(
      `Only the author, coordinators, or admins can ${action} ${resource}.`,
    );
  }
}
