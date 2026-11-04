import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOpportunityGetList,
  ApiRecommendedMatchesQuery,
  OpportunityStatusType,
  UserRole,
  VolunteerStateEngagementType,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { NotFoundError } from "../../../config";
import {
  idParamSchema,
  recommendedMatchesQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  dtoOpportunityListForCaller,
  loadOpportunityList,
} from "../../utils/data/opportunity-list";
import {
  matchScore,
  recommendationOpportunityRelations,
  recommendationVolunteerRelations,
  topRanked,
  volunteerFitsOpportunity,
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
        querystring: recommendedMatchesQuerySchema,
        response: responseSchema("ApiOpportunityGetList#", true, false),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const volunteer = await fastify.db.volunteerRepository.findOne({
        where: { id },
        relations: recommendationVolunteerRelations,
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
      const linked = await fastify.db.opportunityVolunteerRepository.find({
        select: { opportunityId: true },
        where: { volunteerId: id },
      });
      const linkedOpportunityIds = new Set(
        linked.map(({ opportunityId }) => opportunityId),
      );

      const candidates = types.length
        ? (
            await fastify.db.opportunityRepository.find({
              where: {
                status: OpportunityStatusType.SEARCHING,
                type: In(types),
              },
              relations: recommendationOpportunityRelations,
              relationLoadStrategy: "query",
            })
          ).filter(
            (opportunity) =>
              !linkedOpportunityIds.has(opportunity.id) &&
              volunteerFitsOpportunity(volunteer, opportunity),
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
