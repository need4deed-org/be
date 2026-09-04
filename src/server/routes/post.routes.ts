import { FastifyInstance, FastifyPluginOptions } from "fastify";
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
import { isDirectPostReply } from "../../data/utils/is-direct-post-reply";
import { dtoPost } from "../../services/dto/dto-post";
import { dtoPostReply } from "../../services/dto/dto-post-reply";
import {
  idParamSchema,
  paginationQuerySchema,
  responseSchema,
} from "../schema";
import {
  ParamsId,
  QuerystringPagination,
  ReplyData,
  ReplyDataCount,
  ReplyMessage,
} from "../types";
import { getSkipTake } from "../utils";
import { assertCanManagePost } from "../utils/data/assert-can-manage-post";
import { attachReactionData } from "../utils/data/attach-reaction-data";
import { buildPostQuery } from "../utils/data/build-post-query";
import { getAgentPersonRepresentative } from "../utils/data/get-agent-person-representative";
import { getPostReplyOrThrow } from "../utils/data/get-post-reply-or-throw";
import {
  getPostReplyWhere,
  getRootPostWhere,
} from "../utils/data/get-post-where";
import { getRootPostOrThrow } from "../utils/data/get-root-post-or-throw";
import { isPostManagerRole } from "../utils/data/is-post-manager-role";
import { requireReactorPersonId } from "../utils/data/require-reactor-person-id";
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
    Querystring: QuerystringPagination;
    Reply: ReplyDataCount<ApiPostGet[]>;
  }>(
    "/",
    {
      schema: {
        querystring: paginationQuerySchema,
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
      const [skip, take] = getSkipTake(request.query);

      const qb = buildPostQuery(fastify)
        .where("post.parentId IS NULL")
        .orderBy("post.createdAt", "DESC")
        .skip(skip)
        .take(take);

      if (!isPostManagerRole(role)) {
        return reply
          .status(200)
          .send({ message: "Posts.", data: [], count: 0 });
      }

      const [posts, count] = await qb.getManyAndCount();
      await attachReactionData(fastify, posts, request.authUser?.personId);
      return reply.status(200).send({
        message: "Posts.",
        data: posts.map(dtoPost),
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

      const personId = request.authUser?.personId;
      if (!personId) {
        throw new BadRequestError("No person linked to this user.");
      }

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
      updated.replyCount = await fastify.db.postRepository.count({
        where: { rootId: updated.id },
      });
      await attachReactionData(fastify, [updated], request.authUser?.personId);
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

      const personId = request.authUser?.personId;
      if (!personId) {
        throw new BadRequestError("No person linked to this user.");
      }

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
      const personId = requireReactorPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      const post = await getRootPostOrThrow(fastify, id);
      await upsertPostReaction(fastify, post.id, personId, request.body.emoji);

      return reply.status(204).send();
    },
  );

  //
  // DELETE /post/:id/reaction
  //
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id/reaction",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireReactorPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      // Idempotent, and no existence check needed first: a plain delete-by-
      // criteria matches zero rows whether the post doesn't exist or the
      // person just never reacted — both cases are a no-op 204 either way.
      await fastify.db.postReactionRepository.delete({ postId: id, personId });

      return reply.status(204).send();
    },
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
      const personId = requireReactorPersonId(
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

  //
  // DELETE /post/reply/:id/reaction
  //
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/reply/:id/reaction",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const { id } = request.params;
      const personId = requireReactorPersonId(
        request.user.role,
        request.authUser?.personId,
      );

      await fastify.db.postReactionRepository.delete({ postId: id, personId });

      return reply.status(204).send();
    },
  );
}
