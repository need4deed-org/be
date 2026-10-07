import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { ApiActivityLogPost, UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import ActivityLog from "../../../data/entity/m2m/activity-log.entity";
import {
  dtoActivityLogEntry,
  dtoActivityLogGet,
} from "../../../services/dto/dto-activity-log";
import { idParamSchema } from "../../schema";
import { ParamsId } from "../../types";
import { assertAgentOwnsOpportunity } from "../../utils/data/assert-agent-owns-opportunity";

async function assertCanAccessMatchLog(
  fastify: FastifyInstance,
  request: FastifyRequest,
  id: number,
  access: "read" | "write",
): Promise<void> {
  const { role, personId } = request.authUser ?? {};
  const isStaff = role === UserRole.COORDINATOR || role === UserRole.ADMIN;
  const ov = await fastify.db.opportunityVolunteerRepository.findOne({
    where: { id },
    ...(isStaff
      ? {}
      : {
          relations: { opportunity: true, volunteer: true },
          select: {
            id: true,
            opportunityId: true,
            opportunity: { id: true, agentId: true },
            volunteer: { id: true, personId: true },
          },
        }),
  });
  const notFound = new NotFoundError(`OpportunityVolunteer id:${id} not found`);
  if (!ov) {
    throw notFound;
  }
  if (isStaff) {
    return;
  }
  if (role === UserRole.AGENT) {
    await assertAgentOwnsOpportunity(
      request,
      ov.opportunityId,
      ov.opportunity?.agentId,
    );
    return;
  }
  if (role === UserRole.VOLUNTEER && access === "read") {
    if (!personId || ov.volunteer?.personId !== personId) {
      throw notFound;
    }
    return;
  }
  throw new UnauthorizedError();
}

export default async function activityLogCollectionRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

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
      const { id } = request.params;
      await assertCanAccessMatchLog(fastify, request, id, "read");

      const logs = await fastify.db.activityLogRepository.find({
        where: { opportunityVolunteerId: id },
        order: { date: "ASC" },
      });

      return reply.status(200).send(dtoActivityLogGet(logs));
    },
  );

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
      const { id } = request.params;
      await assertCanAccessMatchLog(fastify, request, id, "write");

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
