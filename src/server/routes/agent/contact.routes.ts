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
// AgentPerson row exists for some other role. Cheap (no DB), so it runs
// before the agent-existence check — an unauthenticated/wrong-role caller
// shouldn't get a DB round trip just to be told "no".
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

// Coordinator/admin may act on any agent; an AGENT must be an active member
// of this specific agent. Run this *after* the 404 check for the agent
// itself, so a non-member probing a nonexistent agent id still gets 404
// (matching the rest of the API) rather than a 403 that leaks nothing about
// existence but changes already-established error-code semantics.
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

      assertHasContactManagementRole(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      await assertCanManageContacts(fastify, request, agentId);

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

      assertHasContactManagementRole(request);

      const agent = await fastify.db.agentRepository.findOneBy({
        id: agentId,
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

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

      const updated = await updateAgentContact(membership, request.body);
      updated.agent = agent;

      return reply.status(200).send({
        message: `Contact (membershipId:${membershipId}) updated.`,
        data: dtoSerializeAgentMembership(updated),
      });
    },
  );
}
