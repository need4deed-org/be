import { validate } from "class-validator";
import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  ApiOpportunityEventRegistrationPost,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../config";
import OpportunityEventRegistration from "../../data/entity/opportunity-event-registration.entity";
import {
  opportunityEventRegistrationBodySchema,
  opportunityEventRegistrationResponseSchema,
} from "../schema";
import { ReplyMessage } from "../types/endpoint-handlers";

// Statuses under which an opportunity is still publicly open — same set the
// public opportunity listing filters to (opportunity/legacy.routes.ts).
const OPEN_OPPORTUNITY_STATUSES: OpportunityStatusType[] = [
  OpportunityStatusType.NEW,
  OpportunityStatusType.ACTIVE,
  OpportunityStatusType.SEARCHING,
];

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
      if (!OPEN_OPPORTUNITY_STATUSES.includes(opportunity.status)) {
        throw new BadRequestError("Opportunity is no longer open.");
      }

      const newRegistration = new OpportunityEventRegistration({
        opportunityId,
        ...registration,
      });
      const errors = await validate(newRegistration);
      if (errors.length > 0) {
        throw new BadRequestError(
          errors.flatMap((e) => Object.values(e.constraints || {})).join(", "),
        );
      }

      await fastify.db.opportunityEventRegistrationRepository.save(
        newRegistration,
      );

      return reply
        .status(201)
        .send({ message: "Registration submitted." } as ReplyMessage);
    },
  );
}
