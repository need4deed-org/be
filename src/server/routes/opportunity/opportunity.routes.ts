import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiOpportunityGet, ApiOpportunityGetList } from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { defaultPageSize } from "../../../config/constants";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Comment from "../../../data/entity/volunteer/comment.entity";
import {
  dtoOpportunityGet,
  dtoOpportunityGetList,
} from "../../../services/dto";
import {
  idParamSchema,
  opportunityListQuerySchema,
  responseSchema,
} from "../../schema";
import {
  ParamsId,
  QuerystringOpportunityList,
  ReplyData,
  ReplyDataCount,
  RoutePrefix,
} from "../../types";
import {
  addComments2Entity,
  getCategoryToProfileHandler,
  getDistrictToAgentHandler,
  normalizeStringArrayInput,
} from "../../utils";
import opportunityLegacyRoutes from "./legacy.routes";
import opportunityOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook("onRequest", fastify.authenticate());

  await fastify.register(opportunityLegacyRoutes, {
    prefix: RoutePrefix.LEGACY,
  });

  await fastify.register(opportunityOpportunityVolunteerRoutes, {
    prefix: `:id${RoutePrefix.VOLUNTEER_LINKED}`,
  });

  fastify.get<{ Params: ParamsId; Replay: ReplyData<ApiOpportunityGet> }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiOpportunityGet#"),
      },
    },
    async (request, reply) => {
      const id = request.params.id;
      const relations = [
        "accompanying",
        "deal.profile.profileLanguage.language",
        "deal.profile.profileActivity.activity",
        "deal.profile.profileSkill.skill",
        "deal.location.locationDistrict.district",
        "agent.representative.address.postcode",
      ];

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOne({
        where: { id },
        relations,
      });

      const opportunityComments: Opportunity & { comments: Comment[] } =
        await addComments2Entity(opportunity);

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler(true);
      Object.assign(
        opportunityComments.agent,
        await addDistrictToAgent(opportunityComments.agent),
      );

      if (updates.length) {
        const agentRepository = fastify.db.agentRepository;
        await agentRepository.save(updates);
      }

      const data = dtoOpportunityGet(opportunityComments);

      return reply.status(200).send({ message: `Opportunity id:${id}`, data });
    },
  );
  fastify.get<{
    Querystring: QuerystringOpportunityList;
    Reply: ReplyDataCount<ApiOpportunityGetList[]>;
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

      const data = opportunitiesCategory.map(dtoOpportunityGetList);

      return reply.status(200).send({
        message: `Opportunities page:${page}.`,
        data,
        count,
      });
    },
  );
}
