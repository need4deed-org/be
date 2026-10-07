import { validate } from "class-validator";
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiComment, EntityTableName, UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import { BadRequestError } from "../../config";
import Comment from "../../data/entity/comment.entity";
import CommentPerson from "../../data/entity/m2m/comment-person";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
import { commentSerializer } from "../../services";
import { responseErrors } from "../schema";
import { notifyTaggedByEmail, syncCommentTags } from "../utils";

const COMMENT_READER_ROLES = [UserRole.COORDINATOR, UserRole.ADMIN];

function notifyCommentTags(
  fastify: FastifyInstance,
  comment: Comment,
  personIds: number[],
  tagger: User,
): void {
  if (personIds.length === 0) {
    return;
  }
  const authorName = tagger.person?.name;
  fastify.notify.tagged({
    kind: "comment",
    authorName: authorName ?? "Someone",
    taggedNames: (comment.commentPerson ?? [])
      .filter((cp) => personIds.includes(cp.personId))
      .map((cp) => cp.person?.name)
      .filter((n): n is string => Boolean(n)),
    text: comment.text,
  });
  void notifyTaggedByEmail(fastify, {
    personIds,
    author: { userId: tagger.id, personId: tagger.personId, name: authorName },
    allowedRoles: COMMENT_READER_ROLES,
    text: comment.text,
    where: {
      kind: "comment",
      entityType: comment.entityType,
      entityId: comment.entityId,
    },
  });
}

export default async function commentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
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
      // Non-staff get an empty list, not a 403: the notification badge asks for every role.
      const role = request.authUser?.role;
      if (!role || !COMMENT_READER_ROLES.includes(role)) {
        return reply
          .status(200)
          .send({ message: "Comments", data: [], count: 0 });
      }

      try {
        const { userId, entityId, entityType, taggedPersonId } = request.query;

        const commentRepository = fastify.db.commentRepository;

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

        const role = request.authUser?.role;
        if (!comment || !role || !COMMENT_READER_ROLES.includes(role)) {
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

        notifyCommentTags(
          fastify,
          reloaded,
          (reloaded.commentPerson ?? []).map((cp) => cp.personId),
          reloaded.user,
        );

        return reply.status(201).send({
          message: "Successfully created a new comment",
          data: commentSerializer(reloaded),
        });
      } catch (error) {
        if (error instanceof BadRequestError) {
          throw error;
        }
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

        const user = await fastify.db.userRepository.findOne({
          where: { id: request.user.id },
          relations: ["person"],
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

        let previousPersonIds: number[] = [];
        const reloaded = await commentRepository.manager.transaction(
          async (manager) => {
            await manager.getRepository(Comment).save(comment);
            if (taggedPersonIds !== undefined) {
              previousPersonIds = (
                await manager
                  .getRepository(CommentPerson)
                  .find({ where: { commentId: id }, select: ["personId"] })
              ).map((cp) => cp.personId);
              await syncCommentTags(id, taggedPersonIds, manager);
            }
            return manager.getRepository(Comment).findOne({
              where: { id },
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
          throw new Error(`Failed to reload comment after update`);
        }

        if (taggedPersonIds !== undefined) {
          notifyCommentTags(
            fastify,
            reloaded,
            (reloaded.commentPerson ?? [])
              .map((cp) => cp.personId)
              .filter((personId) => !previousPersonIds.includes(personId)),
            user,
          );
        }

        return {
          message: `Successfully updated comment ${id}`,
          data: commentSerializer(reloaded),
        };
      } catch (error) {
        if (error instanceof BadRequestError) {
          throw error;
        }
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
