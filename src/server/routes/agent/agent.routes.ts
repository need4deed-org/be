import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiAgentGet,
  ApiAgentGetList,
  ApiCommunicationGet,
  UserRole,
} from "need4deed-sdk";
import { dtoAgentGetList } from "../../../services";
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
  getDistrictToAgentHandler,
  getSkipTake,
  normalizeStringArrayInput,
} from "../../utils";
import { addVolunteerToAgent } from "../../utils/data/add-volunteer-to-agent";
import { mockDataAgentCommunication, mockDataAgentGet } from "./mock-data";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );
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
      const agentsDistrictVolunteer = agentsDistrict.map(addVolunteerToAgent);
      const data = agentsDistrictVolunteer.map(dtoAgentGetList);

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

      return reply.status(200).send({
        message: `Agent (id:${id}) fetched successfully`,
        data: mockDataAgentGet(id),
      });
    },
  );

  fastify.get<{
    Params: ParamsId;
    Reply: ReplyDataCount<ApiCommunicationGet[]>;
  }>(
    `/:id${RoutePrefix.COMMUNICATION}`,
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiCommunicationGet#", true),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      return reply.status(200).send({
        message: `Agent (id:${id}) communications fetched successfully`,
        data: mockDataAgentCommunication(),
        count: 2,
      });
    },
  );
}
