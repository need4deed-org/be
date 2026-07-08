import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiPostGet, ApiPostPatch, ApiPostPost, UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/error/fastify";
import { dtoPost } from "../../services/dto/dto-post";
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
      onRequest: [fastify.authenticate({ role: UserRole.AGENT })],
    },
    async (request, reply) => {
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

      const existingPersonIds = new Set(taggedPersons.map((p) => p.id));
      const missingPersonIds = [...new Set(taggedPersonIds)].filter(
        (id) => !existingPersonIds.has(id),
      );
      if (missingPersonIds.length) {
        throw new BadRequestError(
          `Invalid tagged person id(s): ${missingPersonIds.join(", ")}`,
        );
      }

      const existingOpportunityIds = new Set(
        linkedOpportunities.map((o) => o.id),
      );
      const missingOpportunityIds = [...new Set(linkedOpportunityIds)].filter(
        (id) => !existingOpportunityIds.has(id),
      );
      if (missingOpportunityIds.length) {
        throw new BadRequestError(
          `Invalid linked opportunity id(s): ${missingOpportunityIds.join(", ")}`,
        );
      }

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

      if (!full) {throw new NotFoundError("Post not found.");}
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
        where: { id },
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
        const existingIds = new Set(found.map((p) => p.id));
        const missing = [...new Set(taggedPersonIds)].filter(
          (id) => !existingIds.has(id),
        );
        if (missing.length) {
          throw new BadRequestError(
            `Invalid tagged person id(s): ${missing.join(", ")}`,
          );
        }
        post.taggedPersons = found;
      }
      if (linkedOpportunityIds !== null && linkedOpportunityIds !== undefined) {
        const found = linkedOpportunityIds.length
          ? await fastify.db.opportunityRepository.findBy({
              id: In(linkedOpportunityIds),
            })
          : [];
        const existingIds = new Set(found.map((o) => o.id));
        const missing = [...new Set(linkedOpportunityIds)].filter(
          (id) => !existingIds.has(id),
        );
        if (missing.length) {
          throw new BadRequestError(
            `Invalid linked opportunity id(s): ${missing.join(", ")}`,
          );
        }
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

      const post = await fastify.db.postRepository.findOne({ where: { id } });
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
}
