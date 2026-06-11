import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { BadRequestError } from "../../../config/error/fastify";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

const msg400 = "URL param must ba a positive number";

export default function opportunityOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: number };
    // Handler sends entities; the DTO runs in the preSerialization hook.
    Reply: { message: string; data: OpportunityVolunteer[] };
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiOpportunityVolunteerGet#", true, false),
      },
      preSerialization: makePiiSerialization(
        opportunityOpportunityVolunteerDTO,
      ),
    },
    async (request, reply) => {
      const opportunityId = request.params.id;
      if (opportunityId <= 0) {
        throw new BadRequestError(msg400);
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const volunteers = await opportunityVolunteerRepository.find({
        where: {
          opportunityId,
        },
        relations: [
          "volunteer.person",
          "volunteer.deal.dealActivity.activity",
          "volunteer.deal.dealSkill.skill",
          "volunteer.deal.dealLanguage.language",
          "volunteer.deal.dealTimeslot.timeslot",
          "volunteer.deal.dealDistrict.district",
        ],
      });

      // DTO runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message: `Volunteers for opportunity id:${opportunityId}.`,
        data: volunteers,
      });
    },
  );
}
