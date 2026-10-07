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
import Person from "../../data/entity/person.entity";
import Post from "../../data/entity/post.entity";
import { isDirectPostReply } from "../../data/utils/is-direct-post-reply";
import { dtoPost } from "../../services/dto/dto-post";
import { dtoPostReply } from "../../services/dto/dto-post-reply";
import {
  idParamSchema,
  langQuerySchema,
  postListQuerySchema,
  responseSchema,
} from "../schema";
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
import { notifyTaggedByEmail } from "../utils/data/notify-tagged-by-email";
import { requireEngagementPersonId } from "../utils/data/require-engagement-person-id";
import { requireLinkedPersonId } from "../utils/data/require-linked-person-id";
import {
  requestLanguage,
  translateOpportunities,
} from "../utils/data/translate-opportunities";
import { upsertPostBookmark } from "../utils/data/upsert-post-bookmark";
import { upsertPostReaction } from "../utils/data/upsert-post-reaction";
import { validateRelationIds } from "../utils/data/validate-relation-ids";

const POST_READER_ROLES = [
  UserRole.AGENT,
  UserRole.COORDINATOR,
  UserRole.ADMIN,
];

function notifyPostTags(
  fastify: FastifyInstance,
  post: Post,
  added: Person[],
  taggerUserId: number,
  tagger: Person | null | undefined,
): void {
  if (added.length === 0) {
    return;
  }
  fastify.notify.tagged({
    kind: "post",
    authorName: tagger?.name ?? "Someone",
    taggedNames: added.map((p) => p.name).filter(Boolean),
    text: post.text,
  });
  void notifyTaggedByEmail(fastify, {
    personIds: added.map((p) => p.id),
    author: { userId: taggerUserId, personId: tagger?.id, name: tagger?.name },
    allowedRoles: POST_READER_ROLES,
    text: post.text,
    where: { kind: "post" },
  });
}

async function translateLinkedOpportunities(
  fastify: FastifyInstance,
  posts: Post[],
  query: unknown,
): Promise<void> {
  await translateOpportunities(
    fastify,
    posts.flatMap((post) => post.linkedOpportunities ?? []),
    requestLanguage(query),
  );
}

export default async function postRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
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
      const role = request.authUser?.role;
      const filter = request.query;
      const { search, authorId } = filter;
      const [skip, take] = getSkipTake(request.query);

      if (!isPostManagerRole(role)) {
        return reply
          .status(200)
          .send({ message: "Posts.", data: [], count: 0 });
      }

      let orderedPosts: Post[];
      let count: number;

      if (!search) {
        const qb = buildPostQuery(fastify)
          .where("post.parentId IS NULL")
          .orderBy("post.createdAt", "DESC")
          .addOrderBy("post.id", "DESC")
          .skip(skip)
          .take(take);
        if (authorId !== undefined) {
          qb.andWhere("post.authorId = :authorId", { authorId });
        }
        [orderedPosts, count] = await qb.getManyAndCount();
      } else {
        const idsQb = buildMatchingPostIdsQuery(fastify, filter)
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

        count = idRows.length
          ? Number(idRows[0].totalCount)
          : Number(
              (
                await buildMatchingPostIdsQuery(fastify, filter)
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
        count -= ids.length - orderedPosts.length;
      }

      await Promise.all([
        attachReactionData(fastify, orderedPosts, request.authUser?.personId),
        attachBookmarkData(fastify, orderedPosts, request.authUser?.personId),
      ]);
      await translateLinkedOpportunities(fastify, orderedPosts, request.query);
      return reply.status(200).send({
        message: "Posts.",
        data: orderedPosts.map(dtoPost),
        count,
      });
    },
  );

  fastify.post<{ Body: ApiPostPost; Reply: ReplyData<ApiPostGet> }>(
    "/",
    {
      schema: {
        querystring: langQuerySchema,
        body: { $ref: "ApiPostPost#" },
        response: responseSchema({
          dataSchemaRef: "ApiPostGet#",
          statusCode: 201,
        }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
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
      notifyPostTags(
        fastify,
        full,
        full.taggedPersons ?? [],
        request.authUser!.id,
        full.author,
      );
      await translateLinkedOpportunities(fastify, [full], request.query);
      return reply
        .status(201)
        .send({ message: "Post created.", data: dtoPost(full) });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiPostPatch;
    Reply: ReplyData<ApiPostGet>;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        body: { $ref: "ApiPostPatch#" },
        response: responseSchema("ApiPostGet#"),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const role = request.authUser?.role;

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
      const previousTaggedIds = (post.taggedPersons ?? []).map((p) => p.id);

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
      const [replyCount] = await Promise.all([
        fastify.db.postRepository.count({ where: { rootId: updated.id } }),
        attachReactionData(fastify, [updated], request.authUser?.personId),
        attachBookmarkData(fastify, [updated], request.authUser?.personId),
      ]);
      updated.replyCount = replyCount;

      const added = (updated.taggedPersons ?? []).filter(
        (p) => !previousTaggedIds.includes(p.id),
      );
      if (added.length > 0) {
        const taggerPersonId = request.authUser?.personId;
        const tagger =
          taggerPersonId === post.authorId
            ? post.author
            : taggerPersonId
              ? await fastify.db.personRepository
                  .findOneBy({ id: taggerPersonId })
                  .catch(() => null)
              : null;
        notifyPostTags(fastify, updated, added, request.authUser!.id, tagger);
      }
      await translateLinkedOpportunities(fastify, [updated], request.query);
      return reply
        .status(200)
        .send({ message: `Post ${id} updated.`, data: dtoPost(updated) });
    },
  );

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
      const role = request.authUser?.role;

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
        request.authUser?.role,
        request.authUser?.personId,
      );

      const post = await getRootPostOrThrow(fastify, id);
      await upsertPostBookmark(fastify, post.id, personId);

      return reply.status(204).send();
    },
  );

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
        request.authUser?.role,
        request.authUser?.personId,
      );

      await deletePostBookmark(fastify, id, personId);

      return reply.status(204).send();
    },
  );

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
      const role = request.authUser?.role;

      if (!isPostManagerRole(role)) {
        return reply.status(200).send({ message: "Replies.", data: [] });
      }

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
      const role = request.authUser?.role;
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
      const role = request.authUser?.role;

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
      const role = request.authUser?.role;

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
        request.authUser?.role,
        request.authUser?.personId,
      );

      const post = await getRootPostOrThrow(fastify, id);
      await upsertPostReaction(fastify, post.id, personId, request.body.emoji);

      return reply.status(204).send();
    },
  );

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
      request.authUser?.role,
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
        request.authUser?.role,
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
