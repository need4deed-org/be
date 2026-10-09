import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  ApiAgentCreateResponse,
  ApiAgentGetList,
  ApiAgentPatch,
  ApiAgentRegisterNew,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { getRepository } from "../../../data/utils";
import { getDistrictCentroids } from "../../../data/utils/get-district";
import logger from "../../../logger";
import {
  dtoAgentGet,
  dtoAgentGetList,
  getAgentDistrictIdNeedingCentroid,
  parseAgentPatch,
} from "../../../services";
import {
  agentListQuerySchema,
  createAgentBodySchema,
  createAgentResponseSchema,
  idParamSchema,
  registerAgentConflictSchema,
  responseErrors,
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
  addAgentTypeServiceTranslations,
  addComments2Entity,
  assertActiveAgentMemberOrStaff,
  assertAgentVisible,
  assertRoleIn,
  createAddress,
  getAgentWhere,
  getDistrictToAgentHandler,
  getSkipTake,
  patchAddress,
  syncAgentDistrictFromPostcode,
  updateAgentLanguages,
  updateAgentServices,
} from "../../utils";
import { createAgent } from "../../utils/data/write-agent-registration";
import { maskForCaller } from "../../utils/pii/pre-serialization";
import agentCommunicationRoutes from "./agent-communication.routes";
import agentOpportunityRoutes from "./agent-opportunity.routes";
import agentVolunteerRoutes from "./agent-volunteer.routes";
import agentContactRoutes from "./contact.routes";
import agentMembershipRoutes from "./membership.routes";
import agentRegisterRoutes from "./register.routes";

async function denyVolunteer(request: FastifyRequest): Promise<void> {
  const config = request.routeOptions.config as { public?: boolean };
  if (
    config?.public !== true &&
    request.authUser?.role === UserRole.VOLUNTEER
  ) {
    throw new UnauthorizedError();
  }
}

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());
  fastify.addHook("onRequest", denyVolunteer);

  fastify.register(agentRegisterRoutes, { prefix: RoutePrefix.REGISTER });

  fastify.register(agentMembershipRoutes, { prefix: RoutePrefix.MEMBERSHIP });

  fastify.register(agentCommunicationRoutes, {
    prefix: `/:id${RoutePrefix.COMMUNICATION}`,
  });

  fastify.register(agentOpportunityRoutes, {
    prefix: `/:id${RoutePrefix.OPPORTUNITY_LINKED}`,
  });

  fastify.register(agentVolunteerRoutes, {
    prefix: `/:id${RoutePrefix.VOLUNTEER_LINKED}`,
  });

  fastify.register(agentContactRoutes, {
    prefix: `/:id${RoutePrefix.CONTACT}`,
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
      logger.debug(`GET /agent: request.query:${Object.keys(request.query)}`);
      const { page, limit, sortOrder, filter } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const where = await getAgentWhere(filter);

      const role = request.authUser?.role;
      const isPrivileged =
        role === UserRole.COORDINATOR || role === UserRole.ADMIN;
      if (!isPrivileged) {
        where.unclaimed = false;
      }

      logger.debug(
        `GET /agent: filters:${JSON.stringify(filter)}, skip:${skip}, take:${take}`,
      );

      const agentRepository = fastify.db.agentRepository;
      const relations = [
        "address.postcode",
        "district",
        "agentType",
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
      await addAgentTypeServiceTranslations(agentsDistrict);

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      await maskForCaller(request, agentsDistrict);

      const neededDistrictIds = new Map(
        agentsDistrict.map((agent) => [
          agent.id,
          getAgentDistrictIdNeedingCentroid(agent),
        ]),
      );
      const districtCentroids = await getDistrictCentroids([
        ...new Set(
          [...neededDistrictIds.values()].filter(
            (id): id is number => id !== undefined,
          ),
        ),
      ]);

      const data = agentsDistrict.map((agent) => {
        const districtId = neededDistrictIds.get(agent.id);
        return dtoAgentGetList(
          agent,
          districtId !== undefined
            ? districtCentroids.get(districtId)
            : undefined,
        );
      });

      return reply.status(200).send({
        message: `Agents page:${page || 1} fetched successfully`,
        data,
        count,
      });
    },
  );

  fastify.post<{
    Body: ApiAgentRegisterNew;
    Reply: ReplyData<ApiAgentCreateResponse>;
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        body: createAgentBodySchema,
        response: {
          201: createAgentResponseSchema,
          ...responseErrors,
          409: registerAgentConflictSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await createAgent(request.body);
      return reply.status(201).send({
        message: "Agent created successfully.",
        data: result,
      });
    },
  );

  fastify.get<{
    Params: ParamsId;
    Reply: ReplyData<ReturnType<typeof dtoAgentGet>>;
  }>(
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
        "agentType",
        "agentService.service",
        "opportunity.opportunityVolunteer",
        "organization.address.postcode",
        "agentPerson.person.address.postcode",
        "agentLanguage.language",
      ];
      const agent = await agentRepository.findOne({ where: { id }, relations });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      assertAgentVisible(agent, request.authUser?.role);

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler();
      const agentDistrict = await addDistrictToAgent(agent);
      const agentComments = await addComments2Entity(agentDistrict);
      await addAgentTypeServiceTranslations([agentComments]);

      if (updates.length > 0) {
        await agentRepository.save(updates);
      }

      await maskForCaller(request, agentComments);

      const districtIdNeedingCentroid =
        getAgentDistrictIdNeedingCentroid(agentComments);
      const districtCentroid = districtIdNeedingCentroid
        ? (await getDistrictCentroids([districtIdNeedingCentroid])).get(
            districtIdNeedingCentroid,
          )
        : undefined;

      return reply.status(200).send({
        message: `Agent (id:${id}) fetched successfully`,
        data: dtoAgentGet(agentComments, districtCentroid),
      });
    },
  );

  fastify.patch<{ Params: ParamsId; Body: ApiAgentPatch; Reply: null }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAgentPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      logger.debug(`PATCH /agent/${id}, fields:${Object.keys(request.body)}`);

      assertRoleIn(request);

      const agentRepository = fastify.db.agentRepository;
      const agent = await agentRepository.findOneBy({ id });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      await assertActiveAgentMemberOrStaff(
        request,
        id,
        "Only active members of this agent can edit its organization details.",
      );

      const { addressStreet, addressPostcode, languages, serviceIds } =
        request.body;

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

        if (agent.addressId) {
          const addressRepository = getRepository(manager, Address);
          const address = await addressRepository.findOne({
            where: { id: agent.addressId },
            relations: ["postcode"],
          });
          await syncAgentDistrictFromPostcode(agent, address?.postcode);
        }

        await manager.getRepository(Agent).save(agent);

        if (languages) {
          await updateAgentLanguages(id, languages, manager);
        }

        if (serviceIds) {
          await updateAgentServices(id, serviceIds, manager);
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
