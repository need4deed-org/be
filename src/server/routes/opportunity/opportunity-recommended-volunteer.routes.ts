import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiRecommendedMatchesQuery,
  ApiVolunteerGetList,
  RECOMMENDED_MATCHES_DEFAULT_LIMIT,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { volunteerListSerializer } from "../../../services/dto/dto-volunteer";
import {
  idParamSchema,
  recommendedMatchesQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import { assertAgentOwnsOpportunity, assertRoleIn } from "../../utils";
import {
  matchScore,
  recommendationOpportunityRelations,
  recommendedVolunteerRelations,
  topRanked,
  volunteerFitsOpportunity,
} from "../../utils/data/recommended-matches";
import { maskPii } from "../../utils/pii/mask";
import {
  isVolunteerVisible,
  resolveVolunteerVisibility,
} from "../../utils/pii/volunteer-visibility";

export default function opportunityRecommendedVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: ApiRecommendedMatchesQuery;
    Reply: ReplyData<ApiVolunteerGetList[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        querystring: recommendedMatchesQuerySchema,
        response: responseSchema("volunteer-api#", true, false),
      },
    },
    async (request, reply) => {
      assertRoleIn(request);
      const { id } = request.params;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id },
        relations: recommendationOpportunityRelations,
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }
      await assertAgentOwnsOpportunity(request, id, opportunity.agentId);

      const isAgent = request.authUser?.role === UserRole.AGENT;
      const linked = await fastify.db.opportunityVolunteerRepository.find({
        select: { volunteerId: true },
        where: isAgent ? {} : { opportunityId: id },
      });
      const excludedVolunteerIds = new Set(
        linked.map(({ volunteerId }) => volunteerId),
      );

      const visibility = await resolveVolunteerVisibility(request);
      const candidates = (
        await fastify.db.volunteerRepository.find({
          where: { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
          relations: recommendedVolunteerRelations,
          relationLoadStrategy: "query",
        })
      ).filter(
        (volunteer) =>
          volunteer.person &&
          volunteer.deal &&
          !excludedVolunteerIds.has(volunteer.id) &&
          isVolunteerVisible(volunteer, visibility) &&
          volunteerFitsOpportunity(volunteer, opportunity),
      );

      const recommended = topRanked(
        candidates,
        (volunteer) => matchScore(opportunity, volunteer),
        request.query.limit ?? RECOMMENDED_MATCHES_DEFAULT_LIMIT,
      );
      if (visibility) {
        maskPii(recommended, visibility);
      }

      return reply.status(200).send({
        message: `Recommended volunteers for opportunity (id:${id}).`,
        data: recommended.map(volunteerListSerializer).filter(Boolean),
      });
    },
  );
}
