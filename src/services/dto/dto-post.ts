import { ApiPostGet } from "need4deed-sdk";
import Post from "../../data/entity/post.entity";

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
    taggedPersons: (post.taggedPersons ?? []).map((p) => ({
      id: p.id,
      fullName: p.name,
      avatarUrl: p.avatarUrl,
    })),
    linkedOpportunities: (post.linkedOpportunities ?? []).map((o) => ({
      id: o.id,
      title: o.title,
    })),
    createdAt: post.createdAt,
  };
}
