import { validate } from "class-validator";
import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  ApiOpportunityEventRegistrationPost,
  ApiOpportunityEventSummaryGet,
  OpportunityType,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../config";
import OpportunityEventRegistration from "../../data/entity/opportunity-event-registration.entity";
import {
  opportunityEventRegistrationBodySchema,
  opportunityEventRegistrationResponseSchema,
  opportunityEventSummaryParamsSchema,
  opportunityEventSummaryResponseSchema,
} from "../schema";
import { ReplyData, ReplyMessage } from "../types/endpoint-handlers";
import { OPEN_OPPORTUNITY_STATUSES } from "../utils/data/open-opportunity-statuses";

async function findOpenEvent(
  fastify: FastifyInstance,
  opportunityId: number,
): Promise<ApiOpportunityEventSummaryGet> {
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
  return {
    id: opportunity.id,
    title: opportunity.title,
    date: opportunity.onetimer.date,
  };
}

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

      await findOpenEvent(fastify, opportunityId);

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

  fastify.get<{
    Params: { opportunityId: number };
    Reply: ReplyData<ApiOpportunityEventSummaryGet>;
  }>(
    "/:opportunityId",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        params: opportunityEventSummaryParamsSchema,
        response: opportunityEventSummaryResponseSchema,
      },
    },
    async (request, reply) => {
      const data = await findOpenEvent(fastify, request.params.opportunityId);
      return reply.status(200).send({ message: "Event summary.", data });
    },
  );
}
