import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
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
import { getAgentByPostcode, writeOpportunityLegacy } from "../../utils";

export default async function opportunityLegacyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: OpportunityLegacyFormData }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      preHandler: async (request) => {
        const relations = ["agentPerson.person", "agentPostcode.postcode"];
        const agentRepository = fastify.db.agentRepository;
        const email = (request.body.rac_email || "").split("@").pop();
        const agents: Agent[] = await agentRepository.find({
          where: {
            agentPerson: { person: { email: ILike(`%@${email}`) } },
          },
          relations,
        });
        if (agents.length === 0) {
          throw new UnauthorizedError(
            "You've got no permission to submit an opportunity.",
          );
        }
        request.agents = agents;
      },
    },
    async (request, reply) => {
      const opportunity = parseFormData(request.body, parseOpportunityLegacy);

      opportunity.deal = await dealParserOpportunity(request.body);
      opportunity.accompanying = accompanyingParserOpportunity(request.body);

      opportunity.agent = getAgentByPostcode(
        request.agents,
        request.body.rac_plz,
      );

      const id = await writeOpportunityLegacy(opportunity);

      return reply.status(200).send({
        message: "Opportunity has been stored.",
        data: { id },
      });
    },
  );
}
