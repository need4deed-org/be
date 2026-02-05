import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { defaultPageSize } from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Profile from "../../../data/entity/profile/profile.entity";
import { categorize } from "../../../data/utils";
import { dtoOpportunityGetList } from "../../../services/dto/dto-opportunity";
import {
  OpportunityListQuery,
  opportunityListQuerySchema,
  responseSchema,
} from "../../schema";
import { normalizeStringArrayInput } from "../../utils";

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get<{
    Querystring: OpportunityListQuery;
  }>(
    "/",
    {
      schema: {
        querystring: opportunityListQuerySchema,
        response: responseSchema("ApiOpportunityGetList#", true),
      },
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const take = request.query.limit || defaultPageSize;
      const skip = (page - 1) * take;

      const where = {
        ...(request.query.type
          ? {
              type: normalizeStringArrayInput(request.query.type),
            }
          : {}),
        ...(request.query.status
          ? {
              status: normalizeStringArrayInput(request.query.status),
            }
          : {}),
      } as FindOptionsWhere<Opportunity>;

      fastify.log.debug(
        `GET /opportunities called. where: ${JSON.stringify(where)}`,
      );

      const relations = ["deal.profile.profileActivity.activity"];
      const opportunityRepository = fastify.db.opportunityRepository;
      const [opportunities, count] = await opportunityRepository.findAndCount({
        where,
        relations,
        skip,
        take,
      });

      const updates: Profile[] = [];
      const data = opportunities.map((opportunity) => {
        if (opportunity.deal.profile.categoryId) {
          return dtoOpportunityGetList(opportunity);
        }
        opportunity.deal.profile.categoryId = categorize(
          opportunity.deal.profile.profileActivity.map(
            ({ activity }) => activity.categoryId,
          ),
        );
        updates.push(opportunity.deal.profile);
        return dtoOpportunityGetList(opportunity);
      });

      if (updates.length > 0) {
        const profileRepository = fastify.db.profileRepository;
        await profileRepository.save(updates);
      }

      return reply.status(200).send({
        message: `Opportunities page:${page}.`,
        data,
        count,
      });
    },
  );
}
