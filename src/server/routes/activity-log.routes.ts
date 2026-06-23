import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiActivityLogPatch, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { dtoActivityLogEntry } from "../../services/dto/dto-activity-log";
import { idParamSchema } from "../schema";
import { ParamsId } from "../types";

export default async function activityLogRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  // PATCH /activity-log/:id — COORDINATOR only (ADMIN bypasses)
  fastify.patch<{ Params: ParamsId; Body: ApiActivityLogPatch }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiActivityLogPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiActivityLogEntry#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const log = await fastify.db.activityLogRepository.findOne({
        where: { id },
      });
      if (!log) {
        throw new NotFoundError(`Activity log entry id:${id} not found`);
      }

      const updated = await fastify.db.activityLogRepository.save({
        ...log,
        ...request.body,
      });

      return reply.status(200).send({
        message: `Activity log entry id:${id} updated`,
        data: dtoActivityLogEntry(updated),
      });
    },
  );

  // DELETE /activity-log/:id — COORDINATOR only (ADMIN bypasses)
  fastify.delete<{ Params: ParamsId }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: { message: { type: "string" } },
            required: ["message"],
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const log = await fastify.db.activityLogRepository.findOne({
        where: { id },
      });
      if (!log) {
        throw new NotFoundError(`Activity log entry id:${id} not found`);
      }

      await fastify.db.activityLogRepository.remove(log);

      return reply.status(200).send({
        message: `Activity log entry id:${id} deleted`,
      });
    },
  );
}
