import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentMembership,
  UserRole,
} from "need4deed-sdk";
import logger from "../../../logger";
import { dtoSerializeAgentMembership } from "../../../services";
import {
  membershipListQuerySchema,
  membershipListResponseSchema,
  membershipMessageResponseSchema,
  membershipPatchBodySchema,
  responseErrors,
} from "../../schema";
import { ParamsId } from "../../types";

// Moderation of agent memberships. COORDINATOR/ADMIN only — re-gated here since
// the parent /agent onRequest hook was relaxed to logged-in for the GET PII
// work. This is where PENDING joins get approved or rejected.
export default async function agentMembershipRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  // GET /agent/membership?status=pending — list memberships to moderate.
  fastify.get<{ Querystring: { status?: AgentMembershipStatus } }>(
    "/",
    {
      schema: {
        querystring: membershipListQuerySchema,
        response: { 200: membershipListResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const status = request.query.status ?? AgentMembershipStatus.PENDING;
      const rows = await fastify.db.agentPersonRepository.find({
        where: { status },
        relations: [
          "agent",
          "person",
          "person.address",
          "person.address.postcode",
        ],
        order: { id: "DESC" },
      });

      const data: ApiAgentMembership[] = rows.map(dtoSerializeAgentMembership);
      return reply.status(200).send({
        message: `Memberships (${status}) fetched successfully`,
        data,
      });
    },
  );

  // PATCH /agent/membership/:id — approve (status -> active) or change status.
  fastify.patch<{ Params: ParamsId; Body: { status: AgentMembershipStatus } }>(
    "/:id",
    {
      schema: {
        body: membershipPatchBodySchema,
        response: { 200: membershipMessageResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const repo = fastify.db.agentPersonRepository;
      const membership = await repo.findOne({
        where: { id: request.params.id },
      });
      if (!membership) {
        return reply.status(404).send({ message: "Membership not found." });
      }

      membership.status = request.body.status;
      await repo.save(membership);
      logger.debug(
        `agent-membership: ${request.params.id} -> ${request.body.status}`,
      );
      return reply.status(200).send({ message: "Membership updated." });
    },
  );

  // DELETE /agent/membership/:id — reject the join (remove the link).
  fastify.delete<{ Params: ParamsId }>(
    "/:id",
    {
      schema: {
        response: { 200: membershipMessageResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const result = await fastify.db.agentPersonRepository.delete(
        request.params.id,
      );
      if (!result.affected) {
        return reply.status(404).send({ message: "Membership not found." });
      }
      return reply.status(200).send({ message: "Membership removed." });
    },
  );
}
