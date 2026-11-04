import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOpportunityGetList,
  ApiRecommendedMatchesQuery,
  OpportunityStatusType,
  RECOMMENDED_MATCHES_DEFAULT_LIMIT,
  UserRole,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import { In } from "typeorm";
import { NotFoundError } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { dtoOpportunityGetList } from "../../../services/dto/dto-opportunity";
import {
  idParamSchema,
  recommendedMatchesQuerySchema,
  responseSchema,
} from "../../schema";
import { ParamsId, ReplyData } from "../../types";
import {
  matchScore,
  recommendationOpportunityRelations,
  topRanked,
  volunteerFitsOpportunity,
} from "../../utils/data/recommended-matches";
import {
  requestLanguage,
  translateOpportunities,
} from "../../utils/data/translate-opportunities";
import { maskForCaller } from "../../utils/pii/pre-serialization";

const listRelations = [
  "deal.dealActivity.activity",
  "deal.dealLanguage.language",
  "deal.dealTimeslot.timeslot",
  "deal.dealDistrict.district",
  "deal.postcode",
  "agent",
  "agent.address.postcode",
  "accompanying",
  "onetimer",
  "opportunityVolunteer.volunteer.person",
  "originalLanguage",
];

export default function volunteerRecommendedOpportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: ApiRecommendedMatchesQuery & { language?: string };
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
        relations: [
          "deal.dealActivity",
          "deal.dealLanguage.language",
          "deal.dealTimeslot.timeslot",
          "deal.dealDistrict",
        ],
      });
      if (!volunteer) {
        throw new NotFoundError(`Volunteer (id:${id}) not found.`);
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

      const rankedIds = topRanked(
        candidates,
        (opportunity) => matchScore(opportunity, volunteer),
        request.query.limit ?? RECOMMENDED_MATCHES_DEFAULT_LIMIT,
      ).map(({ id: opportunityId }) => opportunityId);

      const loaded = rankedIds.length
        ? await fastify.db.opportunityRepository.find({
            where: { id: In(rankedIds) },
            relations: listRelations,
            relationLoadStrategy: "query",
          })
        : [];
      const loadedById = new Map(loaded.map((o) => [o.id, o]));
      const recommended = rankedIds
        .map((opportunityId) => loadedById.get(opportunityId))
        .filter((o): o is Opportunity => o !== undefined);

      await translateOpportunities(
        fastify,
        recommended,
        requestLanguage(request.query),
      );
      await maskForCaller(request, recommended);

      return reply.status(200).send({
        message: `Recommended opportunities for volunteer (id:${id}).`,
        data: recommended.map((opportunity) =>
          dtoOpportunityGetList(opportunity),
        ),
      });
    },
  );
}
