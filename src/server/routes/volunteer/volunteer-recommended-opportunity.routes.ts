import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOpportunityGetList,
  ApiRecommendedMatchesQuery,
  OpportunityStatusType,
  UserRole,
  VolunteerStateEngagementType,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import { FindOptionsWhere, In, Raw } from "typeorm";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import {
  idParamSchema,
  recommendedOpportunitiesQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { andIntoWhere } from "../../utils";
import { closedForVolunteersIdWhere } from "../../utils/data/no-match-found";
import {
  dtoOpportunityListForCaller,
  loadOpportunityList,
} from "../../utils/data/opportunity-list";
import {
  isGermanOpportunity,
  matchScore,
  recommendationOpportunityRelations,
  recommendationVolunteerRelations,
  speaksFluentGerman,
  topRanked,
} from "../../utils/data/recommended-matches";
import { requestLanguage } from "../../utils/data/translate-opportunities";

export default function volunteerRecommendedOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: Required<ApiRecommendedMatchesQuery> & { language?: string };
    Reply: ReplyData<ApiOpportunityGetList[]>;
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        querystring: recommendedOpportunitiesQuerySchema,
        response: responseSchema("ApiOpportunityGetList#", true, false),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const volunteer = await fastify.db.volunteerRepository.findOne({
        where: { id },
        relations: recommendationVolunteerRelations,
        relationLoadStrategy: "query",
      });
      if (!volunteer) {
        throw new NotFoundError(`Volunteer (id:${id}) not found.`);
      }
      const message = `Recommended opportunities for volunteer (id:${id}).`;
      if (
        volunteer.statusEngagement !== VolunteerStateEngagementType.AVAILABLE
      ) {
        return reply.status(200).send({ message, data: [] });
      }

      const types = volunteerTypesFromStatusType(volunteer.statusType);
      const where: FindOptionsWhere<Opportunity> = {
        status: OpportunityStatusType.SEARCHING,
        type: In(types),
        id: Raw(
          (column) =>
            `${column} NOT IN (SELECT opportunity_id FROM opportunity_volunteer WHERE volunteer_id = :volunteerId)`,
          { volunteerId: id },
        ),
      };
      andIntoWhere(where, "id", closedForVolunteersIdWhere());

      const fluentGerman = speaksFluentGerman(volunteer);
      const candidates = types.length
        ? (
            await fastify.db.opportunityRepository.find({
              where,
              relations: recommendationOpportunityRelations,
              relationLoadStrategy: "query",
            })
          ).filter(
            (opportunity) => fluentGerman || !isGermanOpportunity(opportunity),
          )
        : [];

      const recommended = await loadOpportunityList(
        fastify,
        topRanked(
          candidates,
          (opportunity) => matchScore(opportunity, volunteer),
          request.query.limit,
        ).map(({ id: opportunityId }) => opportunityId),
      );

      const data = await dtoOpportunityListForCaller(
        fastify,
        request,
        recommended,
        requestLanguage(request.query),
      );

      return reply.status(200).send({
        message,
        data,
      });
    },
  );
}
