import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import { isStaffRole } from "./is-staff-role";

export function assertCanManagePost(params: {
  authorId: number;
  requestPersonId: number | undefined;
  role: UserRole | undefined;
  action: "edit" | "delete";
  resource: "posts" | "replies";
}): void {
  const { authorId, requestPersonId, role, action, resource } = params;
  const isAuthor = requestPersonId === authorId;
  const isPrivileged = isStaffRole(role);
  if (!isAuthor && !isPrivileged) {
    throw new UnauthorizedError(
      `Only the author, coordinators, or admins can ${action} ${resource}.`,
    );
  }
}
