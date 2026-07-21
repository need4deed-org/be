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
import { createAgentContact, updateAgentContact } from "../../utils";

// Mirrors the role allowlist on PATCH /opportunity/:id: only these three
// roles may reach the membership check, regardless of whether a stray
// AgentPerson row exists for some other role. Coordinator/admin may act on
// any agent; an AGENT must be an active member of this specific agent.
async function assertCanManageContacts(
  fastify: FastifyInstance,
  request: FastifyRequest,
  agentId: number,
): Promise<void> {
  const role = request.authUser?.role;
  if (
    role !== UserRole.COORDINATOR &&
    role !== UserRole.AGENT &&
    role !== UserRole.ADMIN
  ) {
    throw new UnauthorizedError();
  }

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

// POST /agent/:id/contact — an NGO adding another contact person to their own
// profile. PATCH /agent/:id/contact/:membershipId — updating one. Both are
// distinct from PATCH /person/:id, which is strictly self-only, and from
// POST /agent/register, which only ever links the authenticated caller's own
// person.
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

      await assertCanManageContacts(fastify, request, agentId);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      const agentPerson = await createAgentContact(agentId, request.body);
      agentPerson.agent = agent;

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

      await assertCanManageContacts(fastify, request, agentId);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      const membership = await fastify.db.agentPersonRepository.findOne({
        where: { id: membershipId, agentId },
        relations: ["person.address.postcode"],
      });
      if (!membership) {
        throw new NotFoundError(
          `Contact (membershipId:${membershipId}) not found for agent (id:${agentId}).`,
        );
      }

      const updated = await updateAgentContact(membership, request.body);
      updated.agent = agent;

      return reply.status(200).send({
        message: `Contact (membershipId:${membershipId}) updated.`,
        data: dtoSerializeAgentMembership(updated),
      });
    },
  );
}
