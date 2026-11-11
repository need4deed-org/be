import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGet, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config/error/fastify";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import {
  assertAgentOwnsOpportunity,
  assertRoleIn,
  commuteFor,
  loadCommuteRangesForCaller,
  maskVolunteerIdentities,
  shouldMaskInactiveAgentData,
} from "../../utils";
import { maskForCaller } from "../../utils/pii/pre-serialization";

export default function opportunityOpportunityVolunteerRoutes(
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
        response: responseSchema("ApiOpportunityVolunteerGet#", true, false),
      },
    },
    async (request, reply) => {
      assertRoleIn(request);
      const opportunityId = request.params.id;

      if (request.authUser?.role === UserRole.AGENT) {
        const opportunity = await fastify.db.opportunityRepository.findOne({
          where: { id: opportunityId },
          select: { id: true, agentId: true },
        });
        if (!opportunity) {
          throw new NotFoundError(
            `Opportunity (id:${opportunityId}) not found.`,
          );
        }
        await assertAgentOwnsOpportunity(
          request,
          opportunityId,
          opportunity.agentId,
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

      const commutes = await loadCommuteRangesForCaller(
        request,
        volunteers.map(({ volunteerId, opportunityId, opportunity }) => ({
          volunteerId,
          opportunityId,
          opportunityAgentId: opportunity?.agentId,
        })),
      );
      await maskForCaller(request, volunteers);

      return reply.status(200).send({
        message: `Volunteers for opportunity id:${opportunityId}.`,
        data: volunteers.map((volunteer) => ({
          ...opportunityOpportunityVolunteerDTO(volunteer),
          ...commuteFor(commutes, volunteer),
        })),
      });
    },
  );
}
