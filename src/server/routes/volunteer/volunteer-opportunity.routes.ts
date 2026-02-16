import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGetList } from "need4deed-sdk";
import {
  dtoOpportunitiesCalcCategory,
  dtoVolunteerOpportunityGetList,
} from "../../../services/dto/dto-opportunity";
import { responseErrors } from "../../schema";
import {
  QuerystringVolunteerOpportunityGetList,
  ReplyDataCount,
} from "../../types";
import { getSkipTake, normalizeStringArrayInput } from "../../utils";

export default async function volunteerOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: QuerystringVolunteerOpportunityGetList;
    Reply: ReplyDataCount<ApiVolunteerOpportunityGetList[]>;
  }>(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "array",
                items: { $ref: "volunteer-api-opportunity#" },
              },
              count: { type: "number" },
            },
            required: ["message", "data", "count"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const relations = [
        "deal.profile.profileLanguage.language",
        "deal.profile.profileActivity.activity",
        "deal.location.locationDistrict.district",
        "deal.time.timeTimeslot.timeslot",
      ];

      const { page, limit, ...filters } = request.query;

      const [skip, take] = getSkipTake(page, limit);

      const where = Object.fromEntries(
        Object.entries(filters as QuerystringVolunteerOpportunityGetList).map(
          ([key, value]) => [key, normalizeStringArrayInput(value)],
        ),
      );

      const opportunityRepository = fastify.db.opportunityRepository;

      const [opportunities, count] = await opportunityRepository.findAndCount({
        where,
        relations,
        skip,
        take,
      });

      const data = dtoOpportunitiesCalcCategory(
        opportunities,
        dtoVolunteerOpportunityGetList,
      );

      return reply.status(200).send({
        message: `Opportunities for a volunteer.`,
        data,
        count,
      });
    },
  );
}
