import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGetList } from "need4deed-sdk";
import { dtoVolunteerOpportunityGetList } from "../../../services/dto/dto-opportunity";
import {
  responseSchema,
  volunteerOpportunityListQuerySchema,
} from "../../schema";
import {
  QuerystringVolunteerOpportunityGetList,
  ReplyDataCount,
} from "../../types";
import {
  getCategoryToDealHandler,
  getSkipTake,
  normalizeStringArrayInput,
} from "../../utils";

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
        querystring: volunteerOpportunityListQuerySchema,
        response: responseSchema("ApiVolunteerOpportunityGetList#", true),
      },
    },
    async (request, reply) => {
      const relations = [
        "deal.dealLanguage.language",
        "deal.dealActivity.activity",
        "deal.location.locationDistrict.district",
        "deal.time.timeTimeslot.timeslot",
      ];

      const { page, limit, ...filters } = request.query;

      const [skip, take] = getSkipTake({ page, limit });

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

      const { addCategoryToDeal, updates } = getCategoryToDealHandler();
      const opportunitiesCategory = opportunities.map((opportunity) => {
        Object.assign(
          opportunity.deal,
          addCategoryToDeal(opportunity.deal),
        );
        return opportunity;
      });

      if (updates.length > 0) {
        const dealRepository = fastify.db.dealRepository;
        await dealRepository.save(updates);
      }

      const data = opportunitiesCategory.map(dtoVolunteerOpportunityGetList);

      return reply.status(200).send({
        message: `Opportunities for a volunteer.`,
        data,
        count,
      });
    },
  );
}
