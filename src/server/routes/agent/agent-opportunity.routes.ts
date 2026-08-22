import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { dtoAgentOpportunity } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { assertAgentVisible } from "../../utils";
import { maskFields, PERSON_PII_FIELDS } from "../../utils/pii/mask";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

export default async function agentOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    // Handler sends entities; the DTO (ApiAgentOpportunity) runs in the
    // preSerialization hook after PII masking.
    Reply: ReplyData<Opportunity[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiAgentOpportunity#", true, false),
      },
      preSerialization: makePiiSerialization(dtoAgentOpportunity),
    },
    async (request, reply) => {
      const { id } = request.params;
      const agentRepository = fastify.db.agentRepository;
      const relations = [
        "opportunity.opportunityVolunteer.volunteer.person",
        "opportunity.deal.dealLanguage.language",
        "opportunity.deal.dealActivity.activity",
        "opportunity.deal.dealDistrict.district",
        "opportunity.deal.dealTimeslot.timeslot",
        "opportunity.district",
      ];
      const agent = await agentRepository.findOne({ where: { id }, relations });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);

      // An INACTIVE agent's opportunities shouldn't read as live, actionable
      // data (be#885) — mask title + linked-volunteer identity for everyone
      // except coordinator/admin. Read live off the just-fetched
      // engagementStatus, not a snapshot: flipping the agent back to ACTIVE
      // unmasks its next load. Runs on the entity graph, ahead of the
      // preSerialization hook's PII masking + DTO transform, same as that
      // hook's own masking order.
      const role = request.authUser?.role;
      const isPrivileged =
        role === UserRole.COORDINATOR || role === UserRole.ADMIN;
      if (
        agent.engagementStatus === AgentEngagementStatusType.INACTIVE &&
        !isPrivileged
      ) {
        for (const opportunity of agent.opportunity ?? []) {
          maskFields(opportunity as unknown as Record<string, unknown>, [
            "title",
          ]);
          for (const ov of opportunity.opportunityVolunteer ?? []) {
            if (ov.volunteer?.person) {
              maskFields(
                ov.volunteer.person as unknown as Record<string, unknown>,
                PERSON_PII_FIELDS,
              );
            }
          }
        }
      }

      // DTO (dtoAgentOpportunity) runs in the preSerialization hook after PII
      // masking of the nested volunteer persons.
      return reply.status(200).send({
        message: `Opportunities of the agent (id:${id})`,
        data: agent.opportunity,
      });
    },
  );
}
