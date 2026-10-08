import { ApiComment } from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import logger from "../../logger";

export const UNKNOWN_AUTHOR = "Unknown Author";

export function commentSerializer(comment: Comment): ApiComment {
  const authorName = comment.user?.person?.name;
  if (!authorName) {
    logger.warn(
      `Comment ${comment.id}: author (user ${comment.user?.id ?? comment.userId}) has no person`,
    );
  }
  return {
    id: comment.id,
    content: comment.text,
    entityId: comment.entityId,
    entityType: comment.entityType,
    authorName: authorName || UNKNOWN_AUTHOR,
    timestamp: comment.updatedAt,
    taggedPersons:
      comment.commentPerson
        ?.filter((cp) => cp.personId)
        .map((cp) => ({ id: cp.personId, readAt: cp.readAt ?? null })) ?? [],
  };
}
