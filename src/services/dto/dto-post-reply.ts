import { ApiPostReplyGet } from "need4deed-sdk";
import Post from "../../data/entity/post.entity";

export function dtoPostReply(reply: Post): ApiPostReplyGet {
  return {
    id: reply.id,
    text: reply.text,
    author: {
      id: reply.author.id,
      fullName: reply.author.name,
      avatarUrl: reply.author.avatarUrl,
    },
    postId: reply.rootId as number,
    parentReplyId: reply.parentId === reply.rootId ? null : reply.parentId,
    createdAt: reply.createdAt,
  };
}
