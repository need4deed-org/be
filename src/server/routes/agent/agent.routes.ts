import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAgentGet, ApiAgentGetList, UserRole } from "need4deed-sdk";
import { dtoAgentGet, dtoAgentGetList } from "../../../services";
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
  RoutePrefix,
} from "../../types";
import {
  addComments2Entity,
  getDistrictToAgentHandler,
  getSkipTake,
  normalizeStringArrayInput,
} from "../../utils";
import agentCommunicationRoutes from "./agent-communication.routes";

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
      const { page, limit, ...filters } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const where = Object.fromEntries(
        Object.entries(filters as QuerystringAgentGetList).map(
          ([key, value]) => [key, normalizeStringArrayInput(value)],
        ),
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
        "organization",
        "agentPerson.person.address.postcode",
        "agentLanguage.language",
      ];
      const agent = await agentRepository.findOne({ where: { id }, relations });

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
}
