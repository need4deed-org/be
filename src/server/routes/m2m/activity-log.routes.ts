import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiActivityLogPost, UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import ActivityLog from "../../../data/entity/m2m/activity-log.entity";
import {
  dtoActivityLogEntry,
  dtoActivityLogGet,
} from "../../../services/dto/dto-activity-log";
import { idParamSchema } from "../../schema";
import { ParamsId } from "../../types";

export default async function activityLogCollectionRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  // GET /opportunity-volunteer/:id/activity-log
  fastify.get<{ Params: ParamsId }>(
    "/:id/activity-log",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: { $ref: "ApiActivityLogGet#" },
        },
      },
    },
    async (request, reply) => {
      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT &&
        role !== UserRole.ADMIN
      ) {
        throw new UnauthorizedError();
      }

      const { id } = request.params;

      const ov = await fastify.db.opportunityVolunteerRepository.findOne({
        where: { id },
      });
      if (!ov) {
        throw new NotFoundError(`OpportunityVolunteer id:${id} not found`);
      }

      const logs = await fastify.db.activityLogRepository.find({
        where: { opportunityVolunteerId: id },
        order: { date: "ASC" },
      });

      return reply.status(200).send(dtoActivityLogGet(logs));
    },
  );

  // POST /opportunity-volunteer/:id/activity-log
  fastify.post<{ Params: ParamsId; Body: ApiActivityLogPost }>(
    "/:id/activity-log",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiActivityLogPost#" },
        response: {
          201: {
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
      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT &&
        role !== UserRole.ADMIN
      ) {
        throw new UnauthorizedError();
      }

      const { id } = request.params;

      const ov = await fastify.db.opportunityVolunteerRepository.findOne({
        where: { id },
      });
      if (!ov) {
        throw new NotFoundError(`OpportunityVolunteer id:${id} not found`);
      }

      const log = await fastify.db.activityLogRepository.save(
        new ActivityLog({ ...request.body, opportunityVolunteerId: id }),
      );

      return reply.status(201).send({
        message: `Activity log entry created for OpportunityVolunteer id:${id}`,
        data: dtoActivityLogEntry(log),
      });
    },
  );
}
