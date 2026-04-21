import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiAgentGet,
  ApiAgentGetList,
  ApiAgentPatch,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import logger from "../../../logger";
import {
  dtoAgentGet,
  dtoAgentGetList,
  parseAgentPatch,
} from "../../../services";
import {
  agentListQuerySchema,
  idParamSchema,
  responseSchema,
} from "../../schema";
import {
  ParamsId,
  QuerystringAgentGetList,
  ReplyData,
  ReplyDataCount,
  ReplyMessage,
  RoutePrefix,
} from "../../types";
import {
  addComments2Entity,
  getAgentWhere,
  getDistrictToAgentHandler,
  getSkipTake,
} from "../../utils";
import agentCommunicationRoutes from "./agent-communication.routes";
import agentOpportunityRoutes from "./agent-opportunity.routes";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.register(agentCommunicationRoutes, {
    prefix: `/:id${RoutePrefix.COMMUNICATION}`,
  });

  fastify.register(agentOpportunityRoutes, {
    prefix: `/:id${RoutePrefix.OPPORTUNITY_LINKED}`,
  });

  fastify.get<{
    Querystring: QuerystringAgentGetList;
    Reply: ReplyDataCount<ApiAgentGetList[]>;
  }>(
    "/",
    {
      schema: {
        querystring: agentListQuerySchema,
        response: responseSchema("ApiAgentGetList#", true),
      },
    },
    async (request, reply) => {
      logger.debug(`GET /agents: request.query:${Object.keys(request.query)}`);
      const { page, limit, sortOrder, filter } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const where = getAgentWhere(filter);

      logger.debug(
        `GET /agents: filters:${JSON.stringify(filter)}, skip:${skip}, take:${take}`,
      );

      const agentRepository = fastify.db.agentRepository;
      const relations = [
        "address.postcode",
        "district",
        "opportunity.opportunityVolunteer",
      ];
      const [agents, count] = await agentRepository.findAndCount({
        where,
        relations,
        skip,
        take,
        order: sortOrder
          ? { id: sortOrder === SortOrder.NewToOld ? "DESC" : "ASC" }
          : undefined,
      });

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler();
      const agentsDistrict = await Promise.all(agents.map(addDistrictToAgent));
      const data = agentsDistrict.map(dtoAgentGetList);

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      return reply.status(200).send({
        message: `Agents page:${page || 1} fetched successfully`,
        data,
        count,
      });
    },
  );

  fastify.get<{ Params: ParamsId; Reply: ReplyData<ApiAgentGet> }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiAgentGet#"),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const agentRepository = fastify.db.agentRepository;
      const relations = [
        "address.postcode",
        "district",
        "opportunity.opportunityVolunteer",
        "organization.address.postcode",
        "agentPerson.person.address.postcode",
        "agentLanguage.language",
      ];
      const agent = await agentRepository.findOne({ where: { id }, relations });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler();
      const agentDistrict = await addDistrictToAgent(agent);
      const agentComments = await addComments2Entity(agentDistrict);
      const data = dtoAgentGet(agentComments);

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      return reply.status(200).send({
        message: `Agent (id:${id}) fetched successfully`,
        data,
      });
    },
  );

  fastify.patch<{ Params: ParamsId; Body: ApiAgentPatch; Reply: ReplyMessage }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAgentPatch#" },
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      logger.debug(`id:${id}, body:${JSON.stringify(request.body)}`);
      const agentRepository = fastify.db.agentRepository;
      const agent = await agentRepository.findOneBy({ id });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      const agentObj = Object.assign(agent, parseAgentPatch(request.body));

      await agentRepository.save(agentObj);

      return reply.status(200).send({
        message: `Agent (id:${id}) patched successfully`,
      });
    },
  );
}
