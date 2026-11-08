import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentEngagementStatusType,
  ApiAgentRegistrationLinkResponse,
  UserRole,
} from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import {
  NGO_REGISTRATION_LIFESPAN_MS,
  urlNgoRegistration,
} from "../../../config/constants";
import { idParamSchema, responseErrors } from "../../schema";
import { signedLinkResponseSchema } from "../../schema/user.schema";
import { ParamsId } from "../../types";

export default async function agentRegistrationLinkRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{
    Params: ParamsId;
    Reply: ApiAgentRegistrationLinkResponse;
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.ADMIN }),
      schema: {
        params: idParamSchema,
        response: { 201: signedLinkResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const agentId = request.params.id;
      const agent = await fastify.db.agentRepository.findOne({
        select: { id: true, engagementStatus: true },
        where: { id: agentId },
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      if (agent.engagementStatus === AgentEngagementStatusType.INACTIVE) {
        throw new BadRequestError(
          "An inactive NGO can't get a registration link.",
        );
      }

      const token = fastify.jwt.sign(
        { agentId, type: "ngo-registration" },
        { expiresIn: `${NGO_REGISTRATION_LIFESPAN_MS}` },
      );
      const { exp } = fastify.jwt.decode<{ exp: number }>(token)!;

      return reply.status(201).send({
        token,
        link: `${urlNgoRegistration}?ngo=${encodeURIComponent(token)}`,
        expiresAt: new Date(exp * 1000).toISOString(),
      });
    },
  );
}
