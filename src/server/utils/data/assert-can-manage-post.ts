import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";

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
