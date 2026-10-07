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
import { claimAgent } from "../../utils/data/claim-agent";

export default async function agentMembershipRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

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
      await repo.manager.transaction(async (manager) => {
        await manager.save(membership);
        if (membership.status === AgentMembershipStatus.ACTIVE) {
          await claimAgent(membership.agentId, manager);
        }
      });
      logger.debug(
        `agent-membership: ${request.params.id} -> ${request.body.status}`,
      );
      return reply.status(200).send({ message: "Membership updated." });
    },
  );

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
