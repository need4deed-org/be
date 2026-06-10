import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiAgentGet,
  ApiAgentGetList,
  ApiAgentPatch,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";
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
  createAddress,
  getAgentWhere,
  getDistrictToAgentHandler,
  getSkipTake,
  patchAddress,
  updateAgentLanguages,
} from "../../utils";
import { makePiiSerialization } from "../../utils/pii/pre-serialization";
import agentCommunicationRoutes from "./agent-communication.routes";
import agentOpportunityRoutes from "./agent-opportunity.routes";
import agentMembershipRoutes from "./membership.routes";
import agentRegisterRoutes from "./register.routes";

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GETs are open to any logged-in user (PII is masked per role in the
  // preSerialization hooks below); writes stay COORDINATOR-only (re-gated
  // per-route).
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.register(agentRegisterRoutes, { prefix: RoutePrefix.REGISTER });

  fastify.register(agentMembershipRoutes, { prefix: RoutePrefix.MEMBERSHIP });

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
      preSerialization: makePiiSerialization(dtoAgentGetList),
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
        "agentPerson.person",
        "organization",
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

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      // DTO (dtoAgentGetList) runs in the preSerialization hook after PII
      // masking, so the wire shape is ApiAgentGetList[] despite sending entities.
      return reply.status(200).send({
        message: `Agents page:${page || 1} fetched successfully`,
        data: agentsDistrict as unknown as ApiAgentGetList[],
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
      preSerialization: makePiiSerialization(dtoAgentGet),
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

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      // DTO (dtoAgentGet) runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message: `Agent (id:${id}) fetched successfully`,
        data: agentComments as unknown as ApiAgentGet,
      });
    },
  );

  fastify.patch<{ Params: ParamsId; Body: ApiAgentPatch; Reply: null }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAgentPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      logger.debug(`PATCH /agent/${id}, fields:${Object.keys(request.body)}`);
      const agentRepository = fastify.db.agentRepository;
      const agent = await agentRepository.findOneBy({ id });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      const { addressStreet, addressPostcode, languages } = request.body;

      // Persist address, scalar fields and languages atomically so a partial
      // failure can't leave the agent half-updated.
      await agentRepository.manager.transaction(async (manager) => {
        if (addressStreet || addressPostcode) {
          const addressData = addressStreet ? { street: addressStreet } : {};
          const postcodeData = addressPostcode
            ? { value: addressPostcode }
            : {};

          if (agent.addressId) {
            const success = await patchAddress(
              { id: agent.addressId, ...addressData },
              postcodeData,
              manager,
            );
            if (!success) {
              throw new BadRequestError(
                `Address (id=${agent.addressId}) not updated.`,
              );
            }
          } else {
            const address = await createAddress(
              addressData,
              postcodeData,
              manager,
            );
            if (!address) {
              throw new BadRequestError(
                `Address for agent (id=${id}) not created; a valid postcode is required.`,
              );
            }
            agent.addressId = address.id;
          }
        }

        Object.assign(agent, parseAgentPatch(request.body));
        await manager.getRepository(Agent).save(agent);

        if (languages) {
          await updateAgentLanguages(id, languages, manager);
        }
      });

      return reply.status(204).send();
    },
  );

  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const agentRepository = fastify.db.agentRepository;
      const agent = await agentRepository.findOneBy({ id });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      await agentRepository.delete({ id });

      return reply.status(200).send({
        message: `Agent (id:${id}) deleted successfully`,
      });
    },
  );
}
