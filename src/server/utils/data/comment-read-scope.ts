import { FastifyRequest } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import { Equal, FindOptionsWhere, Raw } from "typeorm";
import Comment from "../../../data/entity/comment.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { isStaffRole } from "./is-staff-role";
import { andIntoWhere } from "./merge-into-where";

type AgentReadScope = {
  userId: number;
  personId: number | null;
  ownerAgentIds: number[];
};
type CommentReadScope = "all" | "none" | AgentReadScope;

export async function resolveCommentReadScope(
  request: FastifyRequest,
): Promise<CommentReadScope> {
  const { authUser } = request;
  if (isStaffRole(authUser?.role)) {
    return "all";
  }
  if (!authUser || authUser.role !== UserRole.AGENT) {
    return "none";
  }
  return {
    userId: authUser.id,
    personId: authUser.personId ?? null,
    ownerAgentIds: await getCallerAgentIds(request, authUser.personId),
  };
}

// NGO members read only comments tagging them on their own volunteers, plus their own: other notes stay staff-only.
export function commentReadWhere(
  base: FindOptionsWhere<Comment>,
  { userId, personId, ownerAgentIds }: AgentReadScope,
): FindOptionsWhere<Comment>[] {
  const authored = { ...base };
  andIntoWhere(authored, "userId", Equal(userId));
  if (!personId || ownerAgentIds.length === 0) {
    return [authored];
  }
  const taggedOnOwned = { ...base };
  andIntoWhere(taggedOnOwned, "entityType", Equal(EntityTableName.VOLUNTEER));
  andIntoWhere(
    taggedOnOwned,
    "entityId",
    Raw(
      (column) =>
        `${column} IN (SELECT id FROM volunteer WHERE owner_agent_id = ANY(:commentOwnerAgentIds))`,
      { commentOwnerAgentIds: ownerAgentIds },
    ),
  );
  andIntoWhere(
    taggedOnOwned,
    "id",
    Raw(
      (column) =>
        `${column} IN (SELECT comment_id FROM comment_person WHERE person_id = :commentReaderPersonId)`,
      { commentReaderPersonId: personId },
    ),
  );
  return [taggedOnOwned, authored];
}
