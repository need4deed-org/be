import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { BadRequestError } from "../../../config/error/fastify";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import {
  assertAgentOwnsOpportunity,
  maskVolunteerIdentities,
  shouldMaskInactiveAgentData,
} from "../../utils";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

const msg400 = "URL param must ba a positive number";

export default function opportunityOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { id: number };
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

      if (request.authUser?.role === UserRole.AGENT) {
        const opportunity = await fastify.db.opportunityRepository.findOne({
          where: { id: opportunityId },
          select: { id: true, agentId: true },
        });
        await assertAgentOwnsOpportunity(
          request,
          opportunityId,
          opportunity?.agentId,
        );
      }

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const volunteers = await opportunityVolunteerRepository.find({
        where: {
          opportunityId,
        },
        relations: [
          "opportunity.agent",
          "volunteer.person",
          "volunteer.deal.dealActivity.activity",
          "volunteer.deal.dealSkill.skill",
          "volunteer.deal.dealLanguage.language",
          "volunteer.deal.dealTimeslot.timeslot",
          "volunteer.deal.dealDistrict.district",
        ],
      });

      const agent = volunteers[0]?.opportunity?.agent;
      if (agent && shouldMaskInactiveAgentData(agent, request.authUser?.role)) {
        maskVolunteerIdentities(volunteers);
      }

      return reply.status(200).send({
        message: `Volunteers for opportunity id:${opportunityId}.`,
        data: volunteers,
      });
    },
  );
}
