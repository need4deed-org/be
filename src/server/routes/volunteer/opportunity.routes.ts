import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGet } from "need4deed-sdk";
import { BadRequestError } from "../../../config/error/fastify";
import { opportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseErrors } from "../../schema";

export default function volunteerOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: string };
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
      const volunteerId = Number(request.params.id);
      if (isNaN(volunteerId) || volunteerId <= 0) {
        throw new BadRequestError("Volunteer id must ba a positive number");
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunities = await opportunityVolunteerRepository.find({
        where: {
          volunteerId,
        },
        relations: ["opportunity"],
      });

      const data = opportunityVolunteerDTO(opportunities);

      return reply.status(200).send({
        message: `Opportunities for volunteer id:${volunteerId}.`,
        data,
      });
    },
  );
}
