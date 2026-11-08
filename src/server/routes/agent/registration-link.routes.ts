import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiAgentRegistrationLinkResponse, UserRole } from "need4deed-sdk";
import { BadRequestError, NotFoundError } from "../../../config";
import {
  NGO_REGISTRATION_LIFESPAN_MS,
  urlNgoRegistration,
} from "../../../config/constants";
import { idParamSchema, responseErrors } from "../../schema";
import { signedLinkResponseSchema } from "../../schema/user.schema";
import { ParamsId } from "../../types";
import { findLinkableAgent } from "../../utils/data/ngo-registration-token";
import { signLink } from "../../utils/data/sign-link";

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
      if (!(await fastify.db.agentRepository.existsBy({ id: agentId }))) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }
      if (!(await findLinkableAgent(fastify, agentId))) {
        throw new BadRequestError(
          "An inactive NGO can't get a registration link.",
        );
      }
      return reply
        .status(201)
        .send(
          signLink(
            fastify,
            { agentId, type: "ngo-registration" },
            NGO_REGISTRATION_LIFESPAN_MS,
            urlNgoRegistration,
            "ngo",
          ),
        );
    },
  );
}
