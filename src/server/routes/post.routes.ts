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
import { In, IsNull, Not } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/error/fastify";
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
import { getAgentPersonRepresentative } from "../utils/data/get-agent-person-representative";
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

      const qb = fastify.db.postRepository
        .createQueryBuilder("post")
        .leftJoinAndSelect("post.author", "author")
        .leftJoinAndSelect("post.taggedPersons", "taggedPerson")
        .leftJoinAndSelect("post.linkedOpportunities", "opportunity")
        .loadRelationCountAndMap("post.replyCount", "post.descendantReplies")
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
        where: { id, parentId: IsNull() },
        relations: ["author", "taggedPersons", "linkedOpportunities"],
      });
      if (!post) {
        throw new NotFoundError(`Post ${id} not found.`);
      }

      const isAuthor = request.authUser?.personId === post.authorId;
      const isPrivileged =
        role === UserRole.ADMIN || role === UserRole.COORDINATOR;
      if (!isAuthor && !isPrivileged) {
        throw new UnauthorizedError(
          "Only the author, coordinators, or admins can edit posts.",
        );
      }

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

      if (
        role !== UserRole.ADMIN &&
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT
      ) {
        throw new UnauthorizedError("Permission denied.");
      }

      const post = await fastify.db.postRepository.findOne({
        where: { id, parentId: IsNull() },
      });
      if (!post) {
        throw new NotFoundError(`Post ${id} not found.`);
      }

      const isAuthor = request.authUser?.personId === post.authorId;
      const isPrivileged =
        role === UserRole.ADMIN || role === UserRole.COORDINATOR;
      if (!isAuthor && !isPrivileged) {
        throw new UnauthorizedError(
          "Only the author, coordinators, or admins can delete posts.",
        );
      }

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

      const { text, parentReplyId } = request.body;

      const post = await fastify.db.postRepository.findOne({
        where: { id, parentId: IsNull() },
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
        if (parentReply.parentId !== parentReply.rootId) {
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
        where: { id, parentId: Not(IsNull()) },
        relations: ["author"],
      });
      if (!postReply) {
        throw new NotFoundError(`Reply ${id} not found.`);
      }

      const isAuthor = request.authUser?.personId === postReply.authorId;
      const isPrivileged =
        role === UserRole.ADMIN || role === UserRole.COORDINATOR;
      if (!isAuthor && !isPrivileged) {
        throw new UnauthorizedError(
          "Only the author, coordinators, or admins can edit replies.",
        );
      }

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
        where: { id, parentId: Not(IsNull()) },
      });
      if (!postReply) {
        throw new NotFoundError(`Reply ${id} not found.`);
      }

      const isAuthor = request.authUser?.personId === postReply.authorId;
      const isPrivileged =
        role === UserRole.ADMIN || role === UserRole.COORDINATOR;
      if (!isAuthor && !isPrivileged) {
        throw new UnauthorizedError(
          "Only the author, coordinators, or admins can delete replies.",
        );
      }

      await fastify.db.postRepository.remove(postReply);
      return reply.status(204).send();
    },
  );
}
