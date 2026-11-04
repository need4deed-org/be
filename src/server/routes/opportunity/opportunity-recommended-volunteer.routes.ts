import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiRecommendedMatchesQuery,
  ApiVolunteerGetList,
  OpportunityStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In, Raw } from "typeorm";
import { NotFoundError } from "../../../config";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { volunteerListSerializer } from "../../../services/dto/dto-volunteer";
import {
  idParamSchema,
  recommendedMatchesQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  andIntoWhere,
  assertAgentOwnsOpportunity,
  assertRoleIn,
  getVolunteerWhere,
} from "../../utils";
import {
  matchScore,
  recommendationOpportunityRelations,
  recommendationVolunteerRelations,
  recommendedVolunteerRelations,
  topRanked,
  volunteerFitsOpportunity,
  volunteerStatusTypesFor,
} from "../../utils/data/recommended-matches";
import { maskPii } from "../../utils/pii/mask";
import { resolveVolunteerVisibility } from "../../utils/pii/volunteer-visibility";

export default function opportunityRecommendedVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: Required<ApiRecommendedMatchesQuery>;
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
      const message = `Recommended volunteers for opportunity (id:${id}).`;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id },
        relations: recommendationOpportunityRelations,
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }
      await assertAgentOwnsOpportunity(request, id, opportunity.agentId);

      if (opportunity.status !== OpportunityStatusType.SEARCHING) {
        return reply.status(200).send({ message, data: [] });
      }

      const visibility = await resolveVolunteerVisibility(request);
      const where = getVolunteerWhere(undefined, visibility);
      Object.assign(where, {
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
        statusType: In(volunteerStatusTypesFor(opportunity.type)),
      });
      andIntoWhere(
        where,
        "id",
        request.authUser?.role === UserRole.AGENT
          ? Raw(
              (column) =>
                `${column} NOT IN (SELECT volunteer_id FROM opportunity_volunteer)`,
            )
          : Raw(
              (column) =>
                `${column} NOT IN (SELECT volunteer_id FROM opportunity_volunteer WHERE opportunity_id = :opportunityId)`,
              { opportunityId: id },
            ),
      );

      const candidates = (
        await fastify.db.volunteerRepository.find({
          where,
          relations: recommendationVolunteerRelations,
          relationLoadStrategy: "query",
        })
      ).filter(
        (volunteer) =>
          volunteer.personId &&
          volunteer.deal &&
          volunteerFitsOpportunity(volunteer, opportunity),
      );

      const rankedIds = topRanked(
        candidates,
        (volunteer) => matchScore(opportunity, volunteer),
        request.query.limit,
      ).map(({ id: volunteerId }) => volunteerId);

      const loaded = rankedIds.length
        ? await fastify.db.volunteerRepository.find({
            where: { id: In(rankedIds) },
            relations: recommendedVolunteerRelations,
            relationLoadStrategy: "query",
          })
        : [];
      const loadedById = new Map(loaded.map((v) => [v.id, v]));
      const recommended = rankedIds
        .map((volunteerId) => loadedById.get(volunteerId))
        .filter((v): v is Volunteer => v !== undefined);
      if (visibility) {
        maskPii(recommended, visibility);
      }

      return reply.status(200).send({
        message,
        data: recommended.map(volunteerListSerializer).filter(Boolean),
      });
    },
  );
}
