import { FastifyInstance } from "fastify";
import { In } from "typeorm";
import Post from "../../../data/entity/post.entity";

// Populates the virtual reactions/myReaction fields on a batch of post/reply
// rows with two batched queries (not N+1 per row) — one grouped count per
// emoji, one lookup for the requesting user's own reaction. Every route that
// returns a post or reply must call this before mapping through
// dtoPost/dtoPostReply, or the response silently reports no reactions.
export async function attachReactionData(
  fastify: FastifyInstance,
  posts: Post[],
  requestPersonId: number | undefined,
): Promise<void> {
  if (posts.length === 0) {
    return;
  }
  const postIds = posts.map((post) => post.id);

  const [counts, mine] = await Promise.all([
    fastify.db.postReactionRepository
      .createQueryBuilder("reaction")
      .select("reaction.postId", "postId")
      .addSelect("reaction.emoji", "emoji")
      .addSelect("COUNT(*)", "count")
      .where("reaction.postId IN (:...postIds)", { postIds })
      .groupBy("reaction.postId")
      .addGroupBy("reaction.emoji")
      .getRawMany<{ postId: number; emoji: string; count: string }>(),
    requestPersonId
      ? fastify.db.postReactionRepository.find({
          where: { postId: In(postIds), personId: requestPersonId },
        })
      : [],
  ]);

  const summariesByPostId = new Map<
    number,
    { emoji: string; count: number }[]
  >();
  for (const row of counts) {
    const list = summariesByPostId.get(row.postId) ?? [];
    list.push({ emoji: row.emoji, count: Number(row.count) });
    summariesByPostId.set(row.postId, list);
  }

  const myReactionByPostId = new Map<number, string>(
    mine.map((r): [number, string] => [r.postId, r.emoji]),
  );

  for (const post of posts) {
    post.reactions = summariesByPostId.get(post.id) ?? [];
    post.myReaction = myReactionByPostId.get(post.id) ?? null;
  }
}
