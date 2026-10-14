import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerOpportunityGetList } from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
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
  findOpportunityAvailabilityDealIds,
  getCategoryToDealHandler,
  getOpportunityWhere,
  getSkipTake,
  mergeIntoWhere,
} from "../../utils";
import {
  languageIdOf,
  requestLanguage,
  translateOpportunities,
} from "../../utils/data/translate-opportunities";
import { maskForCaller } from "../../utils/pii/pre-serialization";

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
        "deal.dealDistrict.district",
        "deal.dealTimeslot.timeslot",
        "deal.postcode",
      ];

      const { page, limit, language, agentId, ...filter } = request.query;

      const [skip, take] = getSkipTake({ page, limit });

      const [searchLanguageId, availabilityDealIds] = await Promise.all([
        filter.search
          ? languageIdOf(dataSource.manager, requestLanguage({ language }))
          : undefined,
        findOpportunityAvailabilityDealIds(filter.availability),
      ]);
      const where = getOpportunityWhere(
        filter,
        undefined,
        searchLanguageId,
        availabilityDealIds,
      );
      if (agentId) {
        mergeIntoWhere<Opportunity>(where, { agentId });
      }

      const opportunityRepository = fastify.db.opportunityRepository;

      const [opportunities, count] = await opportunityRepository.findAndCount({
        where,
        relations,
        skip,
        take,
      });

      const { addCategoryToDeal, updates } = getCategoryToDealHandler();
      const opportunitiesCategory = opportunities.map((opportunity) => {
        addCategoryToDeal(opportunity.deal);
        return opportunity;
      });

      if (updates.length > 0) {
        const dealRepository = fastify.db.dealRepository;
        await dealRepository.save(updates);
      }

      await translateOpportunities(
        fastify,
        opportunitiesCategory,
        requestLanguage({ language }),
      );
      await maskForCaller(request, opportunitiesCategory);
      const data = opportunitiesCategory.map(dtoVolunteerOpportunityGetList);

      return reply.status(200).send({
        message: `Opportunities for a volunteer.`,
        data,
        count,
      });
    },
  );
}
