import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  ApiOpportunityEventRegistrationPost,
  OpportunityType,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../config";
import OpportunityEventRegistration from "../../data/entity/opportunity-event-registration.entity";
import {
  opportunityEventRegistrationBodySchema,
  opportunityEventRegistrationResponseSchema,
} from "../schema";
import { ReplyMessage } from "../types/endpoint-handlers";

export default async function opportunityEventRegistrationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: ApiOpportunityEventRegistrationPost }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        body: opportunityEventRegistrationBodySchema,
        response: opportunityEventRegistrationResponseSchema,
      },
    },
    async (request, reply) => {
      const { opportunityId, ...registration } = request.body;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id: opportunityId },
        relations: ["onetimer"],
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
      }
      if (
        !opportunity.onetimer ||
        opportunity.type === OpportunityType.ACCOMPANYING
      ) {
        throw new BadRequestError("Opportunity is not a dated event.");
      }
      if (new Date(opportunity.onetimer.date).getTime() < Date.now()) {
        throw new BadRequestError("Event date has already passed.");
      }

      await fastify.db.opportunityEventRegistrationRepository.save(
        new OpportunityEventRegistration({ opportunityId, ...registration }),
      );

      return reply
        .status(201)
        .send({ message: "Registration submitted." } as ReplyMessage);
    },
  );
}
