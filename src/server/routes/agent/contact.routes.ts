import { FastifyInstance, FastifyPluginOptions } from "fastify";
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
  assertAgentMemberOrStaffOr403,
  assertAgentVisible,
  assertRoleIn,
  createAgentContact,
  isAgentStaffRole,
  updateAgentContact,
} from "../../utils";
import { maskForCaller } from "../../utils/pii/pre-serialization";

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

      assertRoleIn(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);

      await assertAgentMemberOrStaffOr403(
        request,
        agentId,
        "Only active members of this agent can manage its contacts.",
      );

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

      assertRoleIn(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      assertAgentVisible(agent, request.authUser?.role);

      await assertAgentMemberOrStaffOr403(
        request,
        agentId,
        "Only active members of this agent can manage its contacts.",
      );

      const membership = await fastify.db.agentPersonRepository.findOne({
        where: { id: membershipId, agentId },
        relations: ["person.address.postcode"],
      });
      if (!membership) {
        throw new NotFoundError(
          `Contact (membershipId:${membershipId}) not found for agent (id:${agentId}).`,
        );
      }

      if (
        !isAgentStaffRole(request.authUser?.role) &&
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
