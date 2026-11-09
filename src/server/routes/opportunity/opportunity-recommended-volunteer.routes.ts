import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiRecommendedMatchesQuery,
  ApiRecommendedVolunteer,
  OpportunityStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { FindOptionsWhere, In, Raw } from "typeorm";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { volunteerListSerializer } from "../../../services/dto/dto-volunteer";
import {
  idParamSchema,
  recommendedVolunteersQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  andIntoWhere,
  assertAgentOwnsOpportunity,
  assertRoleIn,
  commuteOf,
  getVolunteerWhere,
  loadCommuteRangesForCaller,
} from "../../utils";
import { closedForVolunteersIdWhere } from "../../utils/data/no-match-found";
import { orderByIds } from "../../utils/data/order-by-ids";
import {
  isGermanOpportunity,
  matchScore,
  recommendationOpportunityRelations,
  recommendationVolunteerRelations,
  speaksFluentGerman,
  topRanked,
  volunteerStatusTypesFor,
} from "../../utils/data/recommended-matches";
import { volunteerListRelations } from "../../utils/data/volunteer-list";
import { maskPii } from "../../utils/pii/mask";
import { resolveVolunteerVisibility } from "../../utils/pii/volunteer-visibility";

export default function opportunityRecommendedVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: Required<ApiRecommendedMatchesQuery>;
    Reply: ReplyData<ApiRecommendedVolunteer[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        querystring: recommendedVolunteersQuerySchema,
        response: responseSchema("ApiRecommendedVolunteer#", true, false),
      },
    },
    async (request, reply) => {
      assertRoleIn(request);
      const { id } = request.params;
      const message = `Recommended volunteers for opportunity (id:${id}).`;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id },
        relations: recommendationOpportunityRelations,
        relationLoadStrategy: "query",
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }
      await assertAgentOwnsOpportunity(request, id, opportunity.agentId);

      const openWhere: FindOptionsWhere<Opportunity> = { id };
      andIntoWhere(openWhere, "id", closedForVolunteersIdWhere());
      if (
        opportunity.status !== OpportunityStatusType.SEARCHING ||
        !(await fastify.db.opportunityRepository.exists({ where: openWhere }))
      ) {
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

      const germanOnly = isGermanOpportunity(opportunity);
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
          (!germanOnly || speaksFluentGerman(volunteer)),
      );

      const rankedIds = topRanked(
        candidates,
        (volunteer) => matchScore(opportunity, volunteer),
        request.query.limit,
      ).map(({ id: volunteerId }) => volunteerId);

      const loaded = rankedIds.length
        ? await fastify.db.volunteerRepository.find({
            where: { id: In(rankedIds) },
            relations: volunteerListRelations("card"),
            relationLoadStrategy: "query",
          })
        : [];
      const recommended = orderByIds(rankedIds, loaded);
      if (visibility) {
        maskPii(recommended, visibility);
      }

      const commutes = await loadCommuteRangesForCaller(
        request,
        recommended.map(({ id: volunteerId }) => ({
          volunteerId,
          opportunityId: id,
          opportunityAgentId: opportunity.agentId,
        })),
      );

      return reply.status(200).send({
        message,
        data: recommended
          .map(volunteerListSerializer)
          .filter(Boolean)
          .map((volunteer) => ({
            ...volunteer,
            commute: commuteOf(commutes, {
              volunteerId: Number(volunteer.id),
              opportunityId: id,
            }),
          })),
      });
    },
  );
}
