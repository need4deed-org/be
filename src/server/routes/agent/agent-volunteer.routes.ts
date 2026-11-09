import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGet } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  assertAgentMemberOrStaffOr404,
  assertAgentVisible,
  commuteFor,
  loadCommuteRangesForCaller,
  maskVolunteerIdentities,
  shouldMaskInactiveAgentData,
} from "../../utils";
import { maskForCaller } from "../../utils/pii/pre-serialization";

export default function agentVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Reply: ReplyData<ApiVolunteerOpportunityGet[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiOpportunityVolunteerGet#", true, false),
      },
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

      const commutes = await loadCommuteRangesForCaller(
        request,
        volunteers.map(({ volunteerId, opportunityId }) => ({
          volunteerId,
          opportunityId,
          opportunityAgentId: id,
        })),
      );
      await maskForCaller(request, volunteers);

      return reply.status(200).send({
        message: `Volunteers linked to agent (id:${id}) via its opportunities.`,
        data: volunteers.map((volunteer) => ({
          ...opportunityOpportunityVolunteerDTO(volunteer),
          ...commuteFor(commutes, volunteer),
        })),
      });
    },
  );
}
