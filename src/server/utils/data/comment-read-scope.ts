import { FastifyRequest } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import { Equal, FindOptionsWhere, In, Raw } from "typeorm";
import Comment from "../../../data/entity/comment.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";
import { resolveGroupCoordinatorScope } from "./group-scope";
import { isStaffRole } from "./is-staff-role";
import { andIntoWhere } from "./merge-into-where";

type AgentReadScope = {
  kind: "agent";
  userId: number;
  personId: number | null;
  ownerAgentIds: number[];
};
type GroupReadScope = {
  kind: "group";
  userId: number;
  agentIds: number[];
};
type CommentReadScope = "all" | "none" | AgentReadScope | GroupReadScope;

export async function resolveCommentReadScope(
  request: FastifyRequest,
): Promise<CommentReadScope> {
  const { authUser } = request;
  const groupScope = await resolveGroupCoordinatorScope(request);
  if (groupScope !== null && authUser) {
    return {
      kind: "group",
      userId: authUser.id,
      agentIds: groupScope.agentIds,
    };
  }
  if (isStaffRole(authUser?.role)) {
    return "all";
  }
  if (!authUser || authUser.role !== UserRole.AGENT) {
    return "none";
  }
  return {
    kind: "agent",
    userId: authUser.id,
    personId: authUser.personId ?? null,
    ownerAgentIds: await getCallerAgentIds(request, authUser.personId),
  };
}

// NGO members read only comments tagging them on their own volunteers, plus their own: other notes stay staff-only.
export function commentReadWhere(
  base: FindOptionsWhere<Comment>,
  scope: AgentReadScope | GroupReadScope,
): FindOptionsWhere<Comment>[] {
  const authored = { ...base };
  andIntoWhere(authored, "userId", Equal(scope.userId));

  if (scope.kind === "group") {
    if (scope.agentIds.length === 0) {
      return [authored];
    }
    const onGroupVolunteers = { ...base };
    andIntoWhere(
      onGroupVolunteers,
      "entityType",
      Equal(EntityTableName.VOLUNTEER),
    );
    andIntoWhere(
      onGroupVolunteers,
      "entityId",
      Raw(
        (column) =>
          `${column} IN (SELECT id FROM volunteer WHERE owner_agent_id = ANY(:groupCommentAgentIds))`,
        { groupCommentAgentIds: scope.agentIds },
      ),
    );

    const onGroupOpportunities = { ...base };
    andIntoWhere(
      onGroupOpportunities,
      "entityType",
      Equal(EntityTableName.OPPORTUNITY),
    );
    andIntoWhere(
      onGroupOpportunities,
      "entityId",
      Raw(
        (column) =>
          `${column} IN (SELECT id FROM opportunity WHERE agent_id = ANY(:groupCommentOppAgentIds))`,
        { groupCommentOppAgentIds: scope.agentIds },
      ),
    );

    const onGroupAgents = { ...base };
    andIntoWhere(onGroupAgents, "entityType", Equal(EntityTableName.AGENT));
    andIntoWhere(onGroupAgents, "entityId", In(scope.agentIds));

    return [onGroupVolunteers, onGroupOpportunities, onGroupAgents, authored];
  }

  const { personId, ownerAgentIds } = scope;
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
