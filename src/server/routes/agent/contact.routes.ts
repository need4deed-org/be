import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentContactPatch,
  ApiAgentContactPost,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { dtoSerializeAgentMembership } from "../../../services";
import {
  agentContactMembershipParamSchema,
  agentContactPatchBodySchema,
  agentContactPostBodySchema,
  agentContactResponseSchema,
  idParamSchema,
} from "../../schema";
import { ParamsId } from "../../types";
import {
  assertAgentVisible,
  createAgentContact,
  updateAgentContact,
} from "../../utils";
import { maskForCaller } from "../../utils/pii/pre-serialization";

function assertHasContactManagementRole(request: FastifyRequest): void {
  const role = request.authUser?.role;
  if (
    role !== UserRole.COORDINATOR &&
    role !== UserRole.AGENT &&
    role !== UserRole.ADMIN
  ) {
    throw new UnauthorizedError();
  }
}

async function assertCanManageContacts(
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
      "Only active members of this agent can manage its contacts.",
    );
  }
}

export default function agentContactRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Params: ParamsId; Body: ApiAgentContactPost }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: agentContactPostBodySchema,
        response: { 201: agentContactResponseSchema },
      },
    },
    async (request, reply) => {
      const agentId = Number(request.params.id);

      assertHasContactManagementRole(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);

      await assertCanManageContacts(fastify, request, agentId);

      const agentPerson = await createAgentContact(
        agentId,
        request.body,
        request.authUser?.role as UserRole,
      );
      agentPerson.agent = agent;
      await maskForCaller(request, agentPerson);

      return reply.status(201).send({
        message: `Contact added to agent (id:${agentId}).`,
        data: dtoSerializeAgentMembership(agentPerson),
      });
    },
  );

  fastify.patch<{
    Params: ParamsId & { membershipId: number };
    Body: ApiAgentContactPatch;
  }>(
    "/:membershipId",
    {
      schema: {
        params: agentContactMembershipParamSchema,
        body: agentContactPatchBodySchema,
        response: { 200: agentContactResponseSchema },
      },
    },
    async (request, reply) => {
      const agentId = Number(request.params.id);
      const membershipId = Number(request.params.membershipId);

      assertHasContactManagementRole(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);

      await assertCanManageContacts(fastify, request, agentId);

      const membership = await fastify.db.agentPersonRepository.findOne({
        where: { id: membershipId, agentId },
        relations: ["person.address.postcode"],
      });
      if (!membership) {
        throw new NotFoundError(
          `Contact (membershipId:${membershipId}) not found for agent (id:${agentId}).`,
        );
      }

      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.ADMIN &&
        membership.status !== AgentMembershipStatus.ACTIVE
      ) {
        throw new UnauthorizedError(
          "Only active contacts of this agent can be edited.",
        );
      }

      const updated = await updateAgentContact(membership, request.body);
      updated.agent = agent;
      await maskForCaller(request, updated);

      return reply.status(200).send({
        message: `Contact (membershipId:${membershipId}) updated.`,
        data: dtoSerializeAgentMembership(updated),
      });
    },
  );
}
