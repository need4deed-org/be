import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentContactPost,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { dtoSerializeAgentMembership } from "../../../services";
import {
  agentContactPostBodySchema,
  agentContactResponseSchema,
  idParamSchema,
} from "../../schema";
import { ParamsId } from "../../types";
import { createAgentContact } from "../../utils";

// POST /agent/:id/contact — an NGO adding another contact person to their own
// profile. Any ACTIVE member of the agent may add one (mirrors the ownership
// check on PATCH /opportunity/:id for AGENT-role status changes);
// COORDINATOR/ADMIN may add a contact to any agent.
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

      // Mirrors the role allowlist on PATCH /opportunity/:id: only these
      // three roles may reach the membership check below, regardless of
      // whether a stray AgentPerson row exists for some other role.
      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT &&
        role !== UserRole.ADMIN
      ) {
        throw new UnauthorizedError();
      }

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      const isCoordinatorOrAdmin =
        role === UserRole.COORDINATOR || role === UserRole.ADMIN;

      if (!isCoordinatorOrAdmin) {
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
            "Only active members of this agent can add a contact.",
          );
        }
      }

      const agentPerson = await createAgentContact(agentId, request.body);
      agentPerson.agent = agent;

      return reply.status(201).send({
        message: `Contact added to agent (id:${agentId}).`,
        data: dtoSerializeAgentMembership(agentPerson),
      });
    },
  );
}
