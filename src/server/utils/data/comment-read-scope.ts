import { FastifyRequest } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import { Equal, FindOptionsWhere, Raw } from "typeorm";
import Comment from "../../../data/entity/comment.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { isStaffRole } from "./is-staff-role";
import { andIntoWhere } from "./merge-into-where";

type CommentReadScope = "all" | "none" | { ownerAgentIds: number[] };

export async function resolveCommentReadScope(
  request: FastifyRequest,
): Promise<CommentReadScope> {
  const { authUser } = request;
  if (isStaffRole(authUser?.role)) {
    return "all";
  }
  if (authUser?.role !== UserRole.AGENT) {
    return "none";
  }
  const ownerAgentIds = await getCallerAgentIds(request, authUser.personId);
  return ownerAgentIds.length > 0 ? { ownerAgentIds } : "none";
}

export function narrowToOwnedVolunteers(
  where: FindOptionsWhere<Comment>,
  { ownerAgentIds }: { ownerAgentIds: number[] },
): void {
  andIntoWhere(where, "entityType", Equal(EntityTableName.VOLUNTEER));
  andIntoWhere(
    where,
    "entityId",
    Raw(
      (column) =>
        `${column} IN (SELECT id FROM volunteer WHERE owner_agent_id = ANY(:commentOwnerAgentIds))`,
      { commentOwnerAgentIds: ownerAgentIds },
    ),
  );
}

export async function isCommentOnOwnedVolunteer(
  request: FastifyRequest,
  comment: Pick<Comment, "entityType" | "entityId">,
  { ownerAgentIds }: { ownerAgentIds: number[] },
): Promise<boolean> {
  if (comment.entityType !== EntityTableName.VOLUNTEER) {
    return false;
  }
  const volunteer = await request.server.db.volunteerRepository.findOne({
    select: { id: true, ownerAgentId: true },
    where: { id: comment.entityId },
  });
  return (
    !!volunteer?.ownerAgentId && ownerAgentIds.includes(volunteer.ownerAgentId)
  );
}
