import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiComment, EntityTableName, UserRole } from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import { commentSerializer } from "../../services";
import { responseErrors } from "../schema";

export default async function commentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
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
      data?: Array<ApiComment>;
    };
  }>(
    "/",
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
              data: { type: "array", items: { $ref: "ApiComment#" } },
              count: { type: "number" },
            },
            required: ["message", "data", "count"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
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

        const data = comments.map(commentSerializer);

        return { message: "Comments", data, count };
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
    "/:id",
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
    "/",
    {
      schema: {
        body: { $ref: "Comment#" },
        response: {
          201: {
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
      const commentRepository = fastify.db.commentRepository;
      const body = request.body as Partial<Comment>;

      const newComment = commentRepository.create({
        ...body,
        user: { id: request.user.id },
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
    "/:id",
    {
      schema: {
        body: { $ref: "Comment#" },
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

        if (user.role !== UserRole.ADMIN && user.id !== comment.user.id) {
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

  fastify.delete(
    "/:id",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
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

        // Only creator or admin can delete
        const user = await fastify.db.userRepository.findOne({
          where: { id: request.user.id },
        });

        if (!user) {
          throw new Error(
            `Error deleting comment ${id}: user ${request.user.id} not found`,
          );
        }

        if (user.role !== UserRole.ADMIN && user.id !== comment.user.id) {
          return reply
            .status(403)
            .send({ message: "Insufficient permissions." });
        }

        await commentRepository.remove(comment);

        return { message: `Successfully deleted comment ${id}` };
      } catch (error) {
        fastify.log.error(`Error deleting comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}
