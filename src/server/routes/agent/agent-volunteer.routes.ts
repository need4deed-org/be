import { FastifyInstance, FastifyPluginOptions } from "fastify";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

export default function agentVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    // Handler sends entities; the DTO runs in the preSerialization hook.
    Reply: ReplyData<OpportunityVolunteer[]>;
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
      const { id } = request.params;

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const volunteers = await opportunityVolunteerRepository.find({
        where: {
          opportunity: { agentId: id },
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
        message: `Volunteers linked to agent (id:${id}) via its opportunities.`,
        data: volunteers,
      });
    },
  );
}
