import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiPostGet,
  ApiPostPatch,
  ApiPostPost,
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
import { buildPostQuery } from "../utils/data/build-post-query";
import { getAgentPersonRepresentative } from "../utils/data/get-agent-person-representative";
import {
  getPostReplyWhere,
  getRootPostWhere,
} from "../utils/data/get-post-where";
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

      if (
        role === UserRole.ADMIN ||
        role === UserRole.COORDINATOR ||
        role === UserRole.AGENT
      ) {
        // no filter — all posts visible
      } else {
        return reply
          .status(200)
          .send({ message: "Posts.", data: [], count: 0 });
      }

      const [posts, count] = await qb.getManyAndCount();
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

      if (
        role !== UserRole.ADMIN &&
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT
      ) {
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
      const full = await buildPostQuery(fastify)
        .where("post.id = :id", { id: updated.id })
        .getOne();
      if (!full) {
        throw new NotFoundError(`Post ${id} not found.`);
      }
      return reply
        .status(200)
        .send({ message: `Post ${id} updated.`, data: dtoPost(full) });
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

      if (
        role !== UserRole.ADMIN &&
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT
      ) {
        throw new UnauthorizedError("Permission denied.");
      }

      const post = await fastify.db.postRepository.findOne({
        where: getRootPostWhere(id),
      });
      if (!post) {
        throw new NotFoundError(`Post ${id} not found.`);
      }

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

      const post = await fastify.db.postRepository.findOne({
        where: getRootPostWhere(id),
      });
      if (!post) {
        throw new NotFoundError(`Post ${id} not found.`);
      }

      let parentId: number = post.id;
      if (parentReplyId !== undefined) {
        const parentReply = await fastify.db.postRepository.findOne({
          where: { id: parentReplyId, rootId: post.id },
        });
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

      const savedReply = await fastify.db.postRepository.save(
        fastify.db.postRepository.create({
          text,
          authorId: personId,
          parentId,
          rootId: post.id,
        }),
      );

      const full = await fastify.db.postRepository.findOne({
        where: { id: savedReply.id },
        relations: ["author"],
      });
      if (!full) {
        throw new NotFoundError("Reply not found.");
      }
      return reply
        .status(201)
        .send({ message: "Reply created.", data: dtoPostReply(full) });
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

      const postReply = await fastify.db.postRepository.findOne({
        where: getPostReplyWhere(id),
      });
      if (!postReply) {
        throw new NotFoundError(`Reply ${id} not found.`);
      }

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
}
