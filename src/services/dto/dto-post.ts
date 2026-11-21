import { ApiPostGet } from "need4deed-sdk";
import Post from "../../data/entity/post.entity";

const byId = <T extends { id: number }>(items: T[] | undefined): T[] =>
  [...(items ?? [])].sort((a, b) => a.id - b.id);

export function dtoPost(post: Post): ApiPostGet {
  return {
    id: post.id,
    text: post.text,
    author: {
      id: post.author.id,
      fullName: post.author.name,
      avatarUrl: post.author.avatarUrl,
    },
    agentId: post.agentId,
    taggedPersons: byId(post.taggedPersons).map((p) => ({
      id: p.id,
      fullName: p.name,
      avatarUrl: p.avatarUrl,
    })),
    taggedAgents: byId(post.taggedAgents).map((agent) => ({
      id: agent.id,
      title: agent.title,
    })),
    linkedOpportunities: byId(post.linkedOpportunities).map((o) => ({
      id: o.id,
      title: o.title,
    })),
    replyCount: post.replyCount ?? 0,
    reactions: post.reactions ?? [],
    myReaction: post.myReaction ?? null,
    bookmarked: post.bookmarked ?? false,
    createdAt: post.createdAt,
  };
}
