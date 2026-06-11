import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { dtoAgentOpportunity } from "../../../services";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
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
      const relations = ["opportunity.opportunityVolunteer.volunteer.person"];
      const agent = await agentRepository.findOne({ where: { id }, relations });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
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
