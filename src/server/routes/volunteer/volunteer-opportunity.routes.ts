import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerOpportunityGetList,
  OpportunityStatusType,
  VolunteerStateTypeType,
} from "need4deed-sdk";
import { BadRequestError } from "../../../config";
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
  getCategoryToProfileHandler,
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
        "deal.profile.profileLanguage.language",
        "deal.profile.profileActivity.activity",
        "deal.location.locationDistrict.district",
        "deal.time.timeTimeslot.timeslot",
      ];

      const { page, limit, ...filters } = request.query;

      const { status, type } = filters as QuerystringVolunteerOpportunityGetList;
      if (status && !Object.values(OpportunityStatusType).includes(status as OpportunityStatusType)) {
        throw new BadRequestError(`Invalid status value: "${status}"`);
      }
      if (type && !Object.values(VolunteerStateTypeType).includes(type as VolunteerStateTypeType)) {
        throw new BadRequestError(`Invalid type value: "${type}"`);
      }

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

      const { addCategoryToProfile, updates } = getCategoryToProfileHandler();
      const opportunitiesCategory = opportunities.map((opportunity) => {
        Object.assign(
          opportunity.deal.profile,
          addCategoryToProfile(opportunity.deal.profile),
        );
        return opportunity;
      });

      if (updates.length > 0) {
        const profileRepository = fastify.db.profileRepository;
        await profileRepository.save(updates);
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
