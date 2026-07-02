import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiComment, EntityTableName, UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import { BadRequestError } from "../../config";
import Comment from "../../data/entity/comment.entity";
import CommentPerson from "../../data/entity/m2m/comment-person";
import logger from "../../logger";
import { commentSerializer } from "../../services";
import { responseErrors } from "../schema";
import { syncCommentTags } from "../utils";

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
      taggedPersonId?: number;
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
            taggedPersonId: { type: "number" },
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
        const { userId, entityId, entityType, taggedPersonId } = request.query;

        const commentRepository = fastify.db.commentRepository;

        // Two-step lookup for the tag filter: a relation-filtered findAndCount
        // would constrain the loaded commentPerson array to only the matching
        // row, which would lie to the DTO about how many people the comment
        // actually tags. Resolve the comment ids first, then load fully.
        let commentIdFilter: number[] | undefined;
        if (taggedPersonId !== undefined) {
          const tagRows = await commentRepository.manager
            .getRepository(CommentPerson)
            .find({
              where: { personId: taggedPersonId },
              select: ["commentId"],
            });
          commentIdFilter = tagRows.map((r) => r.commentId);
          if (commentIdFilter.length === 0) {
            return reply
              .status(200)
              .send({ message: "Comments", data: [], count: 0 });
          }
        }

        const [comments, count] = await commentRepository.findAndCount({
          where: {
            userId,
            entityId,
            entityType,
            ...(commentIdFilter ? { id: In(commentIdFilter) } : {}),
          },
          relations: ["user", "user.person", "language", "commentPerson"],
        });

        if (!comments) {
          return reply.status(404).send({ message: "Comments not found." });
        }

        const data = comments.map(commentSerializer);

        return { message: "Comments", data, count };
      } catch (error) {
        logger.error(`Error fetching comment: ${error}`);
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
          relations: ["user", "user.person", "language", "commentPerson"],
        });

        if (!comment) {
          return reply
            .status(404)
            .send({ message: `Comment id:${id} not found.` });
        }

        return { message: `Details for comment ${id}`, data: comment };
      } catch (error) {
        logger.error(`Error fetching comment: ${error}`);
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
              data: { $ref: "ApiComment#" },
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
      const { taggedPersonIds, ...body } = request.body as Partial<Comment> & {
        taggedPersonIds?: number[];
      };

      const newComment = commentRepository.create({
        ...body,
        user: { id: request.user.id },
      });

      const errors = await validate(newComment);
      if (errors.length > 0) {
        logger.error(`Comment validation errors: ${JSON.stringify(errors)}`);

        return reply.status(400).send({
          message: "Entity validation failed during creation",
          errors: errors.flatMap((e) => Object.values(e.constraints || {})),
        });
      }

      try {
        const reloaded = await commentRepository.manager.transaction(
          async (manager) => {
            const saved = await manager.getRepository(Comment).save(newComment);
            await syncCommentTags(saved.id, taggedPersonIds, manager);
            return manager.getRepository(Comment).findOne({
              where: { id: saved.id },
              relations: [
                "user",
                "user.person",
                "language",
                "commentPerson",
                "commentPerson.person",
              ],
            });
          },
        );

        if (!reloaded) {
          throw new Error(`Failed to reload comment after create`);
        }

        // Notify on Slack when the new comment tags people. Fire-and-forget:
        // commentTagged swallows its own errors and no-ops when the comments
        // Slack webhook is not configured, so it never affects the response.
        if (taggedPersonIds && taggedPersonIds.length > 0) {
          fastify.notify.commentTagged({
            authorName: reloaded.user.person?.name ?? "Someone",
            taggedNames: (reloaded.commentPerson ?? [])
              .map((cp) => cp.person?.name)
              .filter((n): n is string => Boolean(n)),
            text: reloaded.text,
          });
        }

        return reply.status(201).send({
          message: "Successfully created a new comment",
          data: commentSerializer(reloaded),
        });
      } catch (error) {
        // Let BadRequestError (e.g. pre-validation in syncCommentTags) flow
        // to the global handler so it surfaces as 400 with its own message.
        if (error instanceof BadRequestError) {
          throw error;
        }
        // Safety net: pre-validation should have caught this, but if a
        // concurrent delete removed the Person between the check and the
        // INSERT, a 23503 still slips through. Match on the failing table
        // so it can't misfire on unrelated person-named constraints.
        if (
          (error as { code?: string }).code === "23503" &&
          (error as { table?: string }).table === "comment_person"
        ) {
          return reply
            .status(400)
            .send({ message: "Invalid tagged person id." });
        }
        logger.error(`Error creating comment: ${error}`);
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
              data: { $ref: "ApiComment#" },
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

        const { taggedPersonIds, ...patch } =
          request.body as Partial<Comment> & {
            taggedPersonIds?: number[];
          };

        Object.assign(comment, patch, { updatedAt: new Date() });

        const errors = await validate(comment);
        if (errors.length > 0) {
          logger.error(
            `Comment validation errors (PATCH): ${JSON.stringify(errors)}`,
          );
          return reply.status(400).send({
            message: "Entity validation failed during update",
            errors: errors.flatMap((e) => Object.values(e.constraints || {})),
          });
        }

        const reloaded = await commentRepository.manager.transaction(
          async (manager) => {
            await manager.getRepository(Comment).save(comment);
            // Only sync tags when the field was sent in the patch — passing
            // undefined leaves existing comment_person rows untouched, which
            // matches PATCH semantics (only update fields the caller provided).
            if (taggedPersonIds !== undefined) {
              await syncCommentTags(id, taggedPersonIds, manager);
            }
            return manager.getRepository(Comment).findOne({
              where: { id },
              relations: ["user", "user.person", "language", "commentPerson"],
            });
          },
        );

        if (!reloaded) {
          throw new Error(`Failed to reload comment after update`);
        }

        return {
          message: `Successfully updated comment ${id}`,
          data: commentSerializer(reloaded),
        };
      } catch (error) {
        // Let BadRequestError (e.g. pre-validation in syncCommentTags) flow
        // to the global handler so it surfaces as 400 with its own message.
        if (error instanceof BadRequestError) {
          throw error;
        }
        // Safety net: pre-validation should have caught this, but if a
        // concurrent delete removed the Person between the check and the
        // INSERT, a 23503 still slips through. Match on the failing table
        // so it can't misfire on unrelated person-named constraints.
        if (
          (error as { code?: string }).code === "23503" &&
          (error as { table?: string }).table === "comment_person"
        ) {
          return reply
            .status(400)
            .send({ message: "Invalid tagged person id." });
        }
        logger.error(`Error updating comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );

  //
  // PATCH /comment/:id/read
  //
  fastify.patch(
    "/:id/read",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiComment#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate()],
    },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (isNaN(id) || id <= 0) {
        return reply
          .status(400)
          .send({ message: "Invalid comment ID provided." });
      }

      const personId = request.authUser?.personId;
      if (!personId) {
        return reply
          .status(403)
          .send({ message: "No person linked to this user." });
      }

      const cpRepository =
        fastify.db.commentRepository.manager.getRepository(CommentPerson);
      const cp = await cpRepository.findOne({
        where: { commentId: id, personId },
      });
      if (!cp) {
        return reply.status(404).send({
          message: `No tag found for comment id:${id} on your person.`,
        });
      }

      cp.readAt = new Date();
      await cpRepository.save(cp);

      const comment = await fastify.db.commentRepository.findOne({
        where: { id },
        relations: ["user", "user.person", "language", "commentPerson"],
      });
      if (!comment) {
        return reply
          .status(404)
          .send({ message: `Comment id:${id} not found.` });
      }

      return reply.status(200).send({
        message: `Comment id:${id} marked as read`,
        data: commentSerializer(comment),
      });
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
        logger.error(`Error deleting comment: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}
