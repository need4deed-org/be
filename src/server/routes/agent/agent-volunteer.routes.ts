import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { NotFoundError } from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  assertAgentMemberOrStaffOr404,
  assertAgentVisible,
  maskVolunteerIdentities,
  shouldMaskInactiveAgentData,
} from "../../utils";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

export default function agentVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
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

      const agent = await fastify.db.agentRepository.findOneBy({ id });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);
      await assertAgentMemberOrStaffOr404(request, id);

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

      if (shouldMaskInactiveAgentData(agent, request.authUser?.role)) {
        maskVolunteerIdentities(volunteers);
      }

      return reply.status(200).send({
        message: `Volunteers linked to agent (id:${id}) via its opportunities.`,
        data: volunteers,
      });
    },
  );
}
