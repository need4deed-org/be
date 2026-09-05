import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  ApiPostGet,
  ApiPostPatch,
  ApiPostPost,
  ApiPostReactionPost,
  ApiPostReplyGet,
  ApiPostReplyPatch,
  ApiPostReplyPost,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/error/fastify";
import Post from "../../data/entity/post.entity";
import { isDirectPostReply } from "../../data/utils/is-direct-post-reply";
import { dtoPost } from "../../services/dto/dto-post";
import { dtoPostReply } from "../../services/dto/dto-post-reply";
import { idParamSchema, postListQuerySchema, responseSchema } from "../schema";
import {
  ParamsId,
  QuerystringPostList,
  ReplyData,
  ReplyDataCount,
  ReplyMessage,
} from "../types";
import { getSkipTake } from "../utils";
import { assertCanManagePost } from "../utils/data/assert-can-manage-post";
import { attachBookmarkData } from "../utils/data/attach-bookmark-data";
import { attachReactionData } from "../utils/data/attach-reaction-data";
import { buildMatchingPostIdsQuery } from "../utils/data/build-matching-post-ids-query";
import { buildPostQuery } from "../utils/data/build-post-query";
import { deletePostBookmark } from "../utils/data/delete-post-bookmark";
import { deletePostReaction } from "../utils/data/delete-post-reaction";
import {
  getPostReplyOrThrow,
  getRootPostOrThrow,
} from "../utils/data/find-post-or-throw";
import { getAgentPersonRepresentative } from "../utils/data/get-agent-person-representative";
import {
  getPostReplyWhere,
  getRootPostWhere,
} from "../utils/data/get-post-where";
import { isPostManagerRole } from "../utils/data/is-post-manager-role";
import { requireEngagementPersonId } from "../utils/data/require-engagement-person-id";
import { requireLinkedPersonId } from "../utils/data/require-linked-person-id";
import { upsertPostBookmark } from "../utils/data/upsert-post-bookmark";
import { upsertPostReaction } from "../utils/data/upsert-post-reaction";
import { validateRelationIds } from "../utils/data/validate-relation-ids";

export default async function postRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  //
  // GET /post
  //
  fastify.get<{
    Querystring: QuerystringPostList;
    Reply: ReplyDataCount<ApiPostGet[]>;
  }>(
    "/",
    {
      schema: {
        querystring: postListQuerySchema,
        response: responseSchema({
          dataSchemaRef: "ApiPostGet#",
          isArray: true,
          count: true,
        }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { role } = request.user;
      const { search } = request.query;
      const [skip, take] = getSkipTake(request.query);

      if (!isPostManagerRole(role)) {
        return reply
          .status(200)
          .send({ message: "Posts.", data: [], count: 0 });
      }

      let orderedPosts: Post[];
      let count: number;

      if (!search) {
        // Plain listing: buildPostQuery's leftJoinAndSelect + getManyAndCount
        // already paginates correctly despite the to-many joins — TypeORM
        // wraps this in its own distinct-primary-key subquery whenever
        // relations are joined alongside skip/take (see the same pattern,
        // and the comment explaining why, in opportunity.routes.ts). No
        // manual GROUP BY/two-step hydration needed here.
        const qb = buildPostQuery(fastify)
          .where("post.parentId IS NULL")
          .orderBy("post.createdAt", "DESC")
          .addOrderBy("post.id", "DESC")
          .skip(skip)
          .take(take);
        [orderedPosts, count] = await qb.getManyAndCount();
      } else {
        // Search: buildMatchingPostIdsQuery only ever plain-leftJoins (for
        // filtering, not hydration) and runs via getRawMany, so none of
        // TypeORM's automatic pagination handling applies here — GROUP BY
        // collapses the to-many-join fan-out before LIMIT/OFFSET applies,
        // and COUNT(*) OVER() gets the total alongside the page in the same
        // query (a window function, computed over the full pre-LIMIT result
        // set, not just the page). Full posts are then hydrated separately
        // via buildPostQuery, keyed by the fixed page of ids.
        //
        // .limit()/.offset(), not .skip()/.take(): TypeORM's skip/take are
        // meant for getMany()/getManyAndCount() — on a raw, manually-grouped
        // query like this one, skip/take silently produce NO LIMIT/OFFSET at
        // all the moment any join is present, since TypeORM can't run that
        // automatic rewrite outside getMany(). Traced via .getSql() while
        // writing the fan-out regression test above. limit/offset always
        // emit a literal LIMIT/OFFSET, which is exactly right here since
        // GROUP BY has already made each row one distinct post.
        const idsQb = buildMatchingPostIdsQuery(fastify, search)
          .select("post.id", "id")
          .addSelect("COUNT(*) OVER()", "totalCount")
          .groupBy("post.id")
          .orderBy("post.createdAt", "DESC")
          .addOrderBy("post.id", "DESC")
          .offset(skip)
          .limit(take);
        const idRows = await idsQb.getRawMany<{
          id: number;
          totalCount: string;
        }>();
        const ids = idRows.map((row) => row.id);

        // COUNT(*) OVER() only appears on rows that are actually returned —
        // if the requested page is past the last match (idRows is empty),
        // fall back to a direct count so pagination metadata stays correct
        // instead of collapsing to 0.
        count = idRows.length
          ? Number(idRows[0].totalCount)
          : Number(
              (
                await buildMatchingPostIdsQuery(fastify, search)
                  .select("COUNT(DISTINCT post.id)", "count")
                  .getRawOne<{ count: string }>()
              )?.count ?? 0,
            );

        const posts = ids.length
          ? await buildPostQuery(fastify)
              .where("post.id IN (:...ids)", { ids })
              .getMany()
          : [];
        const postsById = new Map(posts.map((post) => [post.id, post]));
        orderedPosts = ids
          .map((id) => postsById.get(id))
          .filter((post): post is Post => post !== undefined);
        // A post deleted between the ids query and hydration would leave
        // `count` inconsistent with `data.length` — keep them in sync.
        count -= ids.length - orderedPosts.length;
      }

      await Promise.all([
        attachReactionData(fastify, orderedPosts, request.authUser?.personId),
        attachBookmarkData(fastify, orderedPosts, request.authUser?.personId),
      ]);
      return reply.status(200).send({
        message: "Posts.",
        data: orderedPosts.map(dtoPost),
        count,
      });
    },
  );

  //
  // POST /post
  //
  fastify.post<{ Body: ApiPostPost; Reply: ReplyData<ApiPostGet> }>(
    "/",
    {
      schema: {
        body: { $ref: "ApiPostPost#" },
        response: responseSchema({
          dataSchemaRef: "ApiPostGet#",
          statusCode: 201,
        }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { role } = request.user;
      if (role !== UserRole.AGENT && role !== UserRole.COORDINATOR) {
        throw new UnauthorizedError(
          "Only agents and coordinators can create posts.",
        );
      }

      const personId = requireLinkedPersonId(request.authUser?.personId);

      const {
        text,
        taggedPersonIds = [],
        linkedOpportunityIds = [],
      } = request.body;

      const agentPerson = await getAgentPersonRepresentative(personId);

      const [taggedPersons, linkedOpportunities] = await Promise.all([
        taggedPersonIds.length
          ? fastify.db.personRepository.findBy({ id: In(taggedPersonIds) })
          : [],
        linkedOpportunityIds.length
          ? fastify.db.opportunityRepository.findBy({
              id: In(linkedOpportunityIds),
            })
          : [],
      ]);

      validateRelationIds(taggedPersonIds, taggedPersons, "tagged person");
      validateRelationIds(
        linkedOpportunityIds,
        linkedOpportunities,
        "linked opportunity",
      );

      const post = fastify.db.postRepository.create({
        text,
        authorId: personId,
        agentId: agentPerson?.agentId ?? null,
        taggedPersons,
        linkedOpportunities,
      });

      const saved = await fastify.db.postRepository.save(post);

      const full = await fastify.db.postRepository.findOne({
        where: { id: saved.id },
        relations: ["author", "taggedPersons", "linkedOpportunities"],
      });

      if (!full) {
        throw new NotFoundError("Post not found.");
      }
      return reply
        .status(201)
        .send({ message: "Post created.", data: dtoPost(full) });
    },
  );

  //
  // PATCH /post/:id
  //
  fastify.patch<{
    Params: ParamsId;
    Body: ApiPostPatch;
    Reply: ReplyData<ApiPostGet>;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiPostPatch#" },
        response: responseSchema("ApiPostGet#"),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (!isPostManagerRole(role)) {
        throw new UnauthorizedError("Permission denied.");
      }

      const post = await fastify.db.postRepository.findOne({
        where: getRootPostWhere(id),
        relations: ["author", "taggedPersons", "linkedOpportunities"],
      });
      if (!post) {
        throw new NotFoundError(`Post ${id} not found.`);
      }

      assertCanManagePost({
        authorId: post.authorId,
        requestPersonId: request.authUser?.personId,
        role,
        action: "edit",
        resource: "posts",
      });

      const { text, taggedPersonIds, linkedOpportunityIds } = request.body;

      if (text !== null && text !== undefined) {
        post.text = text;
      }
      if (taggedPersonIds !== null && taggedPersonIds !== undefined) {
        const found = taggedPersonIds.length
          ? await fastify.db.personRepository.findBy({
              id: In(taggedPersonIds),
            })
          : [];
        validateRelationIds(taggedPersonIds, found, "tagged person");
        post.taggedPersons = found;
      }
      if (linkedOpportunityIds !== null && linkedOpportunityIds !== undefined) {
        const found = linkedOpportunityIds.length
          ? await fastify.db.opportunityRepository.findBy({
              id: In(linkedOpportunityIds),
            })
          : [];
        validateRelationIds(linkedOpportunityIds, found, "linked opportunity");
        post.linkedOpportunities = found;
      }

      const updated = await fastify.db.postRepository.save(post);
      // A lightweight count, not a full buildPostQuery() re-fetch — author/
      // taggedPersons/linkedOpportunities are already loaded on `updated`.
      // Runs alongside attachReactionData/attachBookmarkData — none of the
      // three depend on each other's result.
      const [replyCount] = await Promise.all([
        fastify.db.postRepository.count({ where: { rootId: updated.id } }),
        attachReactionData(fastify, [updated], request.authUser?.personId),
        attachBookmarkData(fastify, [updated], request.authUser?.personId),
      ]);
      updated.replyCount = replyCount;
      return reply
        .status(200)
        .send({ message: `Post ${id} updated.`, data: dtoPost(updated) });
    },
  );

  //
  // DELETE /post/:id
  //
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (!isPostManagerRole(role)) {
        throw new UnauthorizedError("Permission denied.");
      }

      const post = await getRootPostOrThrow(fastify, id);

      assertCanManagePost({
        authorId: post.authorId,
        requestPersonId: request.authUser?.personId,
        role,
        action: "delete",
        resource: "posts",
      });

      await fastify.db.postRepository.remove(post);
      return reply.status(204).send();
    },
  );

  //
  // POST /post/:id/bookmark
  //
  fastify.post<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id/bookmark",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireEngagementPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      const post = await getRootPostOrThrow(fastify, id);
      await upsertPostBookmark(fastify, post.id, personId);

      return reply.status(204).send();
    },
  );

  //
  // DELETE /post/:id/bookmark
  //
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id/bookmark",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireEngagementPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      await deletePostBookmark(fastify, id, personId);

      return reply.status(204).send();
    },
  );

  //
  // GET /post/:id/reply
  //
  fastify.get<{
    Params: ParamsId;
    Reply: ReplyData<ApiPostReplyGet[]>;
  }>(
    "/:id/reply",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({
          dataSchemaRef: "ApiPostReplyGet#",
          isArray: true,
          count: false,
        }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (!isPostManagerRole(role)) {
        // Matches GET /post's own convention: an empty list rather than a
        // 404, so a disallowed role can't distinguish a nonexistent post
        // from one it just isn't allowed to see.
        return reply.status(200).send({ message: "Replies.", data: [] });
      }

      // Full thread, unpaginated (see need4deed-org/sdk#219) — depth-1 and
      // depth-2 replies share the same rootId, so this is a flat list; the
      // client groups depth-2 replies under their parent via parentReplyId.
      // Run alongside the existence check rather than after it — neither
      // depends on the other's result.
      const [, replies] = await Promise.all([
        getRootPostOrThrow(fastify, id),
        fastify.db.postRepository.find({
          where: { rootId: id },
          relations: ["author"],
          order: { createdAt: "ASC", id: "ASC" },
        }),
      ]);

      await attachReactionData(fastify, replies, request.authUser?.personId);
      return reply.status(200).send({
        message: "Replies.",
        data: replies.map(dtoPostReply),
      });
    },
  );

  //
  // POST /post/:id/reply
  //
  fastify.post<{
    Params: ParamsId;
    Body: ApiPostReplyPost;
    Reply: ReplyData<ApiPostReplyGet>;
  }>(
    "/:id/reply",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiPostReplyPost#" },
        response: responseSchema({
          dataSchemaRef: "ApiPostReplyGet#",
          statusCode: 201,
        }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;
      if (role !== UserRole.AGENT && role !== UserRole.COORDINATOR) {
        throw new UnauthorizedError(
          "Only agents and coordinators can reply to posts.",
        );
      }

      const personId = requireLinkedPersonId(request.authUser?.personId);

      const { postId, text, parentReplyId } = request.body;
      if (postId !== id) {
        throw new BadRequestError(
          `Body postId (${postId}) does not match the post id in the URL (${id}).`,
        );
      }
      if (parentReplyId === id) {
        throw new BadRequestError(
          `parentReplyId (${parentReplyId}) must reference a reply, not the post itself — omit parentReplyId to reply directly to the post.`,
        );
      }

      const [post, parentReply] = await Promise.all([
        getRootPostOrThrow(fastify, id),
        parentReplyId !== undefined
          ? fastify.db.postRepository.findOne({
              where: { id: parentReplyId, rootId: id },
            })
          : Promise.resolve(null),
      ]);

      let parentId: number = post.id;
      if (parentReplyId !== undefined) {
        if (!parentReply) {
          throw new NotFoundError(
            `Reply ${parentReplyId} not found on post ${post.id}.`,
          );
        }
        if (!isDirectPostReply(parentReply)) {
          throw new BadRequestError(
            "Cannot reply to a reply-to-a-reply; nesting is limited to one level.",
          );
        }
        parentId = parentReply.id;
      }

      const [savedReply, author] = await Promise.all([
        fastify.db.postRepository.save(
          fastify.db.postRepository.create({
            text,
            authorId: personId,
            parentId,
            rootId: post.id,
          }),
        ),
        fastify.db.personRepository.findOneBy({ id: personId }),
      ]);
      if (!author) {
        throw new NotFoundError("Person not found.");
      }
      savedReply.author = author;

      return reply
        .status(201)
        .send({ message: "Reply created.", data: dtoPostReply(savedReply) });
    },
  );

  //
  // PATCH /post/reply/:id
  //
  fastify.patch<{
    Params: ParamsId;
    Body: ApiPostReplyPatch;
    Reply: ReplyData<ApiPostReplyGet>;
  }>(
    "/reply/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiPostReplyPatch#" },
        response: responseSchema("ApiPostReplyGet#"),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (!isPostManagerRole(role)) {
        throw new UnauthorizedError("Permission denied.");
      }

      const postReply = await fastify.db.postRepository.findOne({
        where: getPostReplyWhere(id),
        relations: ["author"],
      });
      if (!postReply) {
        throw new NotFoundError(`Reply ${id} not found.`);
      }

      assertCanManagePost({
        authorId: postReply.authorId,
        requestPersonId: request.authUser?.personId,
        role,
        action: "edit",
        resource: "replies",
      });

      const { text } = request.body;
      if (text !== null && text !== undefined) {
        postReply.text = text;
      }

      const updated = await fastify.db.postRepository.save(postReply);
      await attachReactionData(fastify, [updated], request.authUser?.personId);
      return reply.status(200).send({
        message: `Reply ${id} updated.`,
        data: dtoPostReply(updated),
      });
    },
  );

  //
  // DELETE /post/reply/:id
  //
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/reply/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.user;

      if (!isPostManagerRole(role)) {
        throw new UnauthorizedError("Permission denied.");
      }

      const postReply = await getPostReplyOrThrow(fastify, id);

      assertCanManagePost({
        authorId: postReply.authorId,
        requestPersonId: request.authUser?.personId,
        role,
        action: "delete",
        resource: "replies",
      });

      await fastify.db.postRepository.remove(postReply);
      return reply.status(204).send();
    },
  );

  //
  // POST /post/:id/reaction
  //
  fastify.post<{
    Params: ParamsId;
    Body: ApiPostReactionPost;
    Reply: ReplyMessage;
  }>(
    "/:id/reaction",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiPostReactionPost#" },
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireEngagementPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      const post = await getRootPostOrThrow(fastify, id);
      await upsertPostReaction(fastify, post.id, personId, request.body.emoji);

      return reply.status(204).send();
    },
  );

  //
  // DELETE /:id/reaction and /reply/:id/reaction — deletePostReaction has no
  // root/reply distinction at all (a reaction's postId is just a row in the
  // shared table either way), so the same handler is registered at both
  // paths rather than duplicated.
  //
  const deleteReactionOptions = {
    schema: {
      params: idParamSchema,
      response: responseSchema({ statusCode: 204 }),
    },
    onRequest: [fastify.authenticate()],
  };
  const deleteReactionHandler = async (
    request: FastifyRequest<{ Params: ParamsId }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;
    const personId = requireEngagementPersonId(
      request.user.role,
      request.authUser?.personId,
    );

    await deletePostReaction(fastify, id, personId);

    return reply.status(204).send();
  };
  fastify.delete<{ Params: ParamsId }>(
    "/:id/reaction",
    deleteReactionOptions,
    deleteReactionHandler,
  );
  fastify.delete<{ Params: ParamsId }>(
    "/reply/:id/reaction",
    deleteReactionOptions,
    deleteReactionHandler,
  );

  //
  // POST /post/reply/:id/reaction
  //
  fastify.post<{
    Params: ParamsId;
    Body: ApiPostReactionPost;
    Reply: ReplyMessage;
  }>(
    "/reply/:id/reaction",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiPostReactionPost#" },
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireEngagementPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      const postReply = await getPostReplyOrThrow(fastify, id);
      await upsertPostReaction(
        fastify,
        postReply.id,
        personId,
        request.body.emoji,
      );

      return reply.status(204).send();
    },
  );
}
