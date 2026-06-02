import { ApiComment } from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";

export function commentSerializer(comment: Comment): ApiComment {
  return {
    id: comment.id,
    content: comment.text,
    entityId: comment.entityId,
    entityType: comment.entityType,
    authorName: comment.user?.person?.name,
    timestamp: comment.updatedAt,
    taggedPersonIds:
      comment.commentPerson?.map((cp) => cp.personId).filter(Boolean) ?? [],
  };
}
