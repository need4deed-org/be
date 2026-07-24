import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentPatch,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
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
import agentVolunteerRoutes from "./agent-volunteer.routes";
import agentContactRoutes from "./contact.routes";
import agentMembershipRoutes from "./membership.routes";
import agentRegisterRoutes from "./register.routes";

// Mirrors the role allowlist in contact.routes.ts: only these three roles may
// reach the membership check. Cheap (no DB), so it runs before the
// agent-existence check.
function assertHasOrgEditRole(request: FastifyRequest): void {
  const role = request.authUser?.role;
  if (
    role !== UserRole.COORDINATOR &&
    role !== UserRole.AGENT &&
    role !== UserRole.ADMIN
  ) {
    throw new UnauthorizedError();
  }
}

// Coordinator/admin may edit any agent; an AGENT must be an active member of
// this specific agent. Run this *after* the 404 check for the agent itself,
// so a non-member probing a nonexistent agent id still gets 404 rather than
// a 403 that changes already-established error-code semantics.
async function assertCanEditOrg(
  fastify: FastifyInstance,
  request: FastifyRequest,
  agentId: number,
): Promise<void> {
  const role = request.authUser?.role;
  if (role === UserRole.COORDINATOR || role === UserRole.ADMIN) {
    return;
  }

  const personId = request.authUser?.personId;
  const membership = personId
    ? await fastify.db.agentPersonRepository.findOneBy({
        agentId,
        personId,
        status: AgentMembershipStatus.ACTIVE,
      })
    : null;
  if (!membership) {
    throw new UnauthorizedError(
      "Only active members of this agent can edit its organization details.",
    );
  }
}

export default async function agentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GETs are open to any logged-in user (PII is masked per role in the
  // preSerialization hooks below); writes are re-gated per-route: DELETE
  // stays COORDINATOR-only, PATCH also allows an active AgentPerson member.
  fastify.addHook("onRequest", fastify.authenticate());

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
    // Handler sends entities; the DTO (ApiAgentGetList) runs in the
    // preSerialization hook, so the send is typed as the entity.
    Reply: ReplyDataCount<Agent[]>;
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
      logger.debug(`GET /agent: request.query:${Object.keys(request.query)}`);
      const { page, limit, sortOrder, filter } = request.query;
      const [skip, take] = getSkipTake({ page, limit });
      const where = getAgentWhere(filter);

      logger.debug(
        `GET /agent: filters:${JSON.stringify(filter)}, skip:${skip}, take:${take}`,
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

      // DTO (dtoAgentGetList) runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message: `Agents page:${page || 1} fetched successfully`,
        data: agentsDistrict,
        count,
      });
    },
  );

  fastify.get<{ Params: ParamsId; Reply: ReplyData<Agent> }>(
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
        data: agentComments,
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

      assertHasOrgEditRole(request);

      const agentRepository = fastify.db.agentRepository;
      const agent = await agentRepository.findOneBy({ id });

      if (!agent) {
        throw new NotFoundError(`Agent (id:${id}) not found.`);
      }

      await assertCanEditOrg(fastify, request, id);

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
