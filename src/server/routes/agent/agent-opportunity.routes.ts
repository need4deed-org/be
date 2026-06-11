import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { idParamSchema } from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";

export default async function agentOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: ParamsId; Reply: ReplyData<Opportunity[]> }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        // TODO: add response schema!
      },
      // No DTO yet (sends raw entities) — masking still applies to nested
      // volunteer persons; identity passthrough keeps the shape.
      preSerialization: makePiiSerialization((o: Opportunity) => o),
    },
    async (request, reply) => {
      const { id } = request.params;
      const agentRepository = fastify.db.agentRepository;
      const relations = ["opportunity.opportunityVolunteer.volunteer.person"];
      const agent = await agentRepository.findOne({ where: { id }, relations });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      // TODO: add DTO for agent profile

      return reply.status(200).send({
        message: `Opportunities of the agent (id:${id})`,
        data: agent.opportunity,
      });
    },
  );
}
