import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config/error/fastify";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { opportunityOpportunityVolunteerDTO } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import {
  getCallerAgentIds,
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

      if (agent && request.authUser?.role === UserRole.AGENT) {
        const agentIds = await getCallerAgentIds(
          fastify,
          request.authUser.personId,
        );
        if (!agentIds.includes(agent.id)) {
          throw new NotFoundError(
            `Opportunity (id:${opportunityId}) not found.`,
          );
        }
      }

      // An INACTIVE agent's linked volunteers shouldn't read as live,
      // actionable data (be#885) here either — this route surfaces the same
      // underlying rows as GET /agent/:id/volunteer-linked, just scoped by
      // opportunityId instead of agentId, so it needs the same rule. All
      // rows share one opportunity/agent, so checking the first is enough.
      if (agent && shouldMaskInactiveAgentData(agent, request.authUser?.role)) {
        maskVolunteerIdentities(volunteers);
      }

      // DTO runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message: `Volunteers for opportunity id:${opportunityId}.`,
        data: volunteers,
      });
    },
  );
}
