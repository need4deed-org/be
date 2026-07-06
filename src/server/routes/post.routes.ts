import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  ApiPostPatch,
  ApiPostPost,
  UserRole,
} from "need4deed-sdk";
import { Brackets, In } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../config/error/fastify";
import { dtoPost } from "../../services/dto/dto-post";
import { idParamSchema, responseSchema } from "../schema";
import { getSkipTake } from "../utils";

const postListQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 120 },
  },
  additionalProperties: false,
};

export default async function postRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  //
  // GET /post
  //
  fastify.get<{ Querystring: { page?: number; limit?: number } }>(
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
      const { role, id: userId } = request.user;
      const [skip, take] = getSkipTake(request.query);

      const qb = fastify.db.postRepository
        .createQueryBuilder("post")
        .leftJoinAndSelect("post.author", "author")
        .leftJoinAndSelect("post.taggedPersons", "taggedPerson")
        .leftJoinAndSelect("post.linkedOpportunities", "opportunity")
        .orderBy("post.createdAt", "DESC")
        .skip(skip)
        .take(take);

      if (role === UserRole.ADMIN || role === UserRole.COORDINATOR) {
        // no filter — all posts visible
      } else if (role === UserRole.AGENT) {
        const user = await fastify.db.userRepository.findOne({
          where: { id: userId },
          select: ["personId"],
        });
        const membership = user?.personId
          ? ((await fastify.db.agentPersonRepository.findOne({
              where: {
                personId: user.personId,
                status: AgentMembershipStatus.ACTIVE,
                role: AgentRoleType.VOLUNTEER_COORDINATOR,
              },
              order: { id: "ASC" },
            })) ??
            (await fastify.db.agentPersonRepository.findOne({
              where: {
                personId: user.personId,
                status: AgentMembershipStatus.ACTIVE,
              },
              order: { id: "ASC" },
            })))
          : null;

        if (!membership) {
          return reply
            .status(200)
            .send({ message: "Posts.", data: [], count: 0 });
        }
        qb.where("post.agentId = :agentId", { agentId: membership.agentId });
      } else if (role === UserRole.VOLUNTEER) {
        const user = await fastify.db.userRepository.findOne({
          where: { id: userId },
          select: ["personId"],
        });
        if (!user?.personId) {
          return reply
            .status(200)
            .send({ message: "Posts.", data: [], count: 0 });
        }

        const memberships = await fastify.db.agentPersonRepository.find({
          where: {
            personId: user.personId,
            status: AgentMembershipStatus.ACTIVE,
          },
          select: ["agentId"],
        });
        const agentIds = memberships.map((m) => m.agentId);

        qb.where(
          new Brackets((sub) => {
            sub.where("taggedPerson.id = :personId", {
              personId: user.personId,
            });
            if (agentIds.length > 0) {
              sub.orWhere("post.agentId IN (:...agentIds)", { agentIds });
            }
          }),
        );
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
  fastify.post<{ Body: ApiPostPost }>(
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
      const { id: userId, role } = request.user;
      const {
        text,
        taggedPersonIds = [],
        linkedOpportunityIds = [],
      } = request.body;

      const user = await fastify.db.userRepository.findOne({
        where: { id: userId },
        select: ["personId"],
      });
      if (!user?.personId) {
        throw new BadRequestError("No person linked to this user.");
      }

      let agentId: number | null = null;
      if (role === UserRole.AGENT) {
        const membership =
          (await fastify.db.agentPersonRepository.findOne({
            where: {
              personId: user.personId,
              status: AgentMembershipStatus.ACTIVE,
              role: AgentRoleType.VOLUNTEER_COORDINATOR,
            },
            order: { id: "ASC" },
          })) ??
          (await fastify.db.agentPersonRepository.findOne({
            where: {
              personId: user.personId,
              status: AgentMembershipStatus.ACTIVE,
            },
            order: { id: "ASC" },
          }));
        agentId = membership?.agentId ?? null;
      }

      const taggedPersons = taggedPersonIds.length
        ? await fastify.db.personRepository.findBy({ id: In(taggedPersonIds) })
        : [];
      const linkedOpportunities = linkedOpportunityIds.length
        ? await fastify.db.opportunityRepository.findBy({
            id: In(linkedOpportunityIds),
          })
        : [];

      const post = fastify.db.postRepository.create({
        text,
        authorId: user.personId,
        agentId,
        taggedPersons,
        linkedOpportunities,
      });

      const saved = await fastify.db.postRepository.save(post);

      const full = await fastify.db.postRepository.findOne({
        where: { id: saved.id },
        relations: ["author", "taggedPersons", "linkedOpportunities"],
      });

      return reply
        .status(201)
        .send({ message: "Post created.", data: dtoPost(full!) });
    },
  );

  //
  // PATCH /post/:id
  //
  fastify.patch<{ Params: { id: string }; Body: ApiPostPatch }>(
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
      const id = Number(request.params.id);
      const { role } = request.user;

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
        post.taggedPersons = taggedPersonIds.length
          ? await fastify.db.personRepository.findBy({
              id: In(taggedPersonIds),
            })
          : [];
      }
      if (linkedOpportunityIds !== null && linkedOpportunityIds !== undefined) {
        post.linkedOpportunities = linkedOpportunityIds.length
          ? await fastify.db.opportunityRepository.findBy({
              id: In(linkedOpportunityIds),
            })
          : [];
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
  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      const { role } = request.user;

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
