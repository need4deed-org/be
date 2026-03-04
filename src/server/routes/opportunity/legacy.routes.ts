import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { OpportunityLegacyFormData } from "need4deed-sdk";
import { ILike } from "typeorm";
import { UnauthorizedError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
import {
  accompanyingParserOpportunity,
  parseFormData,
  parseOpportunityLegacy,
} from "../../../services";
import { dealParserOpportunity } from "../../../services/dto/parser-deal-opportunity";
import { writeOpportunityLegacy } from "../../utils";

export default async function opportunityLegacyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: OpportunityLegacyFormData }>(
    "/",
    {
      preHandler: async (request) => {
        const relations = ["representative"];
        const agentRepository = fastify.db.agentRepository;
        const emailDomain = (request.body.rac_email || "").split("@").pop();
        const agent: Agent = await agentRepository.findOne({
          where: { representative: { email: ILike(`%@${emailDomain}`) } },
          relations,
        });
        if (!agent) {
          throw new UnauthorizedError(
            "You've got no permission to submit an opportunity.",
          );
        }
        request.agent = agent;
      },
    },
    async (request, reply) => {
      const opportunity = parseFormData(request.body, parseOpportunityLegacy);

      opportunity.deal = await dealParserOpportunity(request.body);
      opportunity.accompanying = accompanyingParserOpportunity(request.body);
      opportunity.agent = request.agent;

      const id = await writeOpportunityLegacy(opportunity);

      return reply.status(200).send({
        message: "Opportunity has been stored.",
        data: { id },
      });
    },
  );
}
