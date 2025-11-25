import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { EntityTableName } from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import { Role } from "../../data/types";
import { responseErrors } from "../schema";
import { RoutePrefix } from "../types";

async function commentRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.COMMENT;

  //
  // GET /comment
  //
  fastify.get<{
    Querystring: {
      userId?: number;
      entityId?: number;
      entityType?: EntityTableName;
    };
    Reply: {
      message: string;
      count?: number;
      data?: Array<Comment>;
    };
  }>(
    prefixedPath,
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            userId: { type: "number" },
            entityId: { type: "number" },
            entityType: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array", items: { $ref: "Comment#" } },
              count: { type: "number" },
            },
            required: ["message", "data", "count"],
          },
          ...responseErrors,
        },
      },
      // onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      try {
        const { userId, entityId, entityType } = request.query;

        const commentRepository = fastify.db.commentRepository;
        const [comments, count] = await commentRepository.findAndCount({
          where: { userId, entityId, entityType },
          relations: ["user", "user.person", "language"],
        });

        if (!comments) {
          return reply.status(404).send({ message: "Comments not found." });
        }

        return { message: "Comments", data: comments, count };
      } catch (error) {
        fastify.log.error(`Error fetching comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );

  //
  // GET /comment/:id
  //
  fastify.get(
    `${prefixedPath}/:id`,
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "Comment#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      try {
        const id = Number((request.params as { id: string }).id);
        if (isNaN(id) || id <= 0) {
          return reply.status(400).send({
            message: "Invalid comment ID provided.",
          });
        }

        const commentRepository = fastify.db.commentRepository;
        const comment = await commentRepository.findOne({
          where: { id },
          relations: ["user", "user.person", "language"],
        });

        if (!comment) {
          return reply
            .status(404)
            .send({ message: `Comment id:${id} not found.` });
        }

        return { message: `Details for comment ${id}`, data: comment };
      } catch (error) {
        fastify.log.error(`Error fetching comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );

  //
  // POST /comment
  //
  fastify.post(
    prefixedPath,
    {
      schema: {
        body: { type: "object", additionalProperties: true },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "object", additionalProperties: true },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const commentRepository = fastify.db.commentRepository;
      const body = request.body as Partial<Comment>;

      const newComment = commentRepository.create({
        ...body,
        user: { id: request.user.id },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const errors = await validate(newComment);
      if (errors.length > 0) {
        fastify.log.error(
          `Comment validation errors: ${JSON.stringify(errors)}`,
        );

        return reply.status(400).send({
          message: "Entity validation failed during creation",
          errors: errors.flatMap((e) => Object.values(e.constraints || {})),
        });
      }

      try {
        const saved = await commentRepository.save(newComment);
        return reply.status(201).send({
          message: "Successfully created a new comment",
          data: saved,
        });
      } catch (error) {
        fastify.log.error(`Error creating comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );

  //
  // PATCH /comment/:id
  //
  fastify.patch(
    `${prefixedPath}/:id`,
    {
      schema: {
        body: { type: "object", additionalProperties: true },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "object", additionalProperties: true },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      try {
        const id = Number((request.params as { id: string }).id);
        if (isNaN(id) || id <= 0) {
          return reply.status(400).send({
            message: "Invalid comment ID provided.",
          });
        }

        const commentRepository = fastify.db.commentRepository;
        const comment = await commentRepository.findOne({
          where: { id },
          relations: ["user"],
        });

        if (!comment) {
          return reply
            .status(404)
            .send({ message: `Comment id:${id} not found.` });
        }

        // Only creator or admin can edit
        const user = await fastify.db.userRepository.findOne({
          where: { id: request.user.id },
        });

        if (!user) {
          throw new Error(
            `Error updating comment ${id}: user ${request.user.id} not found`,
          );
        }

        if (user.role !== Role.ADMIN && user.id !== comment.user.id) {
          return reply
            .status(403)
            .send({ message: "Insufficient permissions." });
        }

        Object.assign(comment, request.body, {
          updatedAt: new Date(),
        });

        const errors = await validate(comment);
        if (errors.length > 0) {
          fastify.log.error(
            `Comment validation errors (PATCH): ${JSON.stringify(errors)}`,
          );
          return reply.status(400).send({
            message: "Entity validation failed during update",
            errors: errors.flatMap((e) => Object.values(e.constraints || {})),
          });
        }

        const saved = await commentRepository.save(comment);

        return {
          message: `Successfully updated comment ${id}`,
          data: saved,
        };
      } catch (error) {
        fastify.log.error(`Error updating comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}

export default fp(commentRoutes, {
  name: "comment-routes",
  dependencies: ["typeorm-plugin"],
});
