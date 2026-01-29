import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerOpportunityGet,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config/error/fastify";
import { opportunityVolunteerDTO } from "../../../services";
import {
  idmM2mIdParamSchema,
  idParamSchema,
  responseErrors,
} from "../../schema";

const msg400 = "URL param must ba a positive number";

const msg404 = (m2mId: number, volunteerId: number) =>
  `There's no M2M relation id:${m2mId} for volunteer id:${volunteerId} to an opportunity`;

const msg200 = (
  opportunityId: number,
  volunteerId: number,
  action: "updated" | "deleted",
) =>
  `Relation for volunteer id:${volunteerId} and opportunity id:${opportunityId} has been ${action}.`;

export default function volunteerOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: number };
    Reply: { message: string; data: ApiVolunteerOpportunityGet[] };
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "array",
                items: { $ref: "ApiVolunteerOpportunityGet#" },
              },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const volunteerId = request.params.id;
      if (volunteerId <= 0) {
        throw new BadRequestError(msg400);
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunities = await opportunityVolunteerRepository.find({
        where: {
          volunteerId,
        },
        relations: ["opportunity"],
      });

      const data = opportunities.map(opportunityVolunteerDTO);

      return reply.status(200).send({
        message: `Opportunities for volunteer id:${volunteerId}.`,
        data,
      });
    },
  );

  fastify.patch<{
    Params: { id: number; m2mId: number };
    Reply: { message: string; data: ApiVolunteerOpportunityGet };
    Body: { status: OpportunityVolunteerStatusType };
  }>(
    "/:m2mId",
    {
      schema: {
        params: idmM2mIdParamSchema,
        body: { $ref: "ApiVolunteerOpportunityPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiVolunteerOpportunityGet#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const { id: volunteerId, m2mId } = request.params;
      if (volunteerId <= 0 || m2mId <= 0) {
        throw new BadRequestError(msg400);
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunity = await opportunityVolunteerRepository.findOne({
        where: { id: m2mId },
        relations: ["opportunity"],
      });

      if (!opportunity) {
        throw new NotFoundError(msg404(m2mId, volunteerId));
      }

      opportunityVolunteerRepository.merge(opportunity, request.body);
      await opportunityVolunteerRepository.save(opportunity, { reload: true });

      const data = opportunityVolunteerDTO(opportunity);
      return reply.status(200).send({
        message: msg200(opportunity.opportunityId, volunteerId, "updated"),
        data,
      });
    },
  );

  fastify.delete<{
    Params: { id: number; m2mId: number };
    Reply: { message: string };
  }>(
    "/:m2mId",
    {
      schema: {
        params: idmM2mIdParamSchema,
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
    },
    async (request, reply) => {
      const { id: volunteerId, m2mId } = request.params;
      if (volunteerId <= 0 || m2mId <= 0) {
        throw new BadRequestError("Param id must ba a positive number");
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunity = await opportunityVolunteerRepository.findOne({
        where: { id: m2mId },
      });

      if (!opportunity) {
        throw new NotFoundError(msg404(m2mId, volunteerId));
      }

      await opportunityVolunteerRepository.delete({ id: m2mId });

      return reply.status(200).send({
        message: msg200(opportunity.opportunityId, volunteerId, "deleted"),
      });
    },
  );
}
