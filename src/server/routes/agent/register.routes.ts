import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import User from "../../../data/entity/user.entity";
import logger from "../../../logger";
import {
  registerAgentBodySchema,
  registerAgentResponseSchema,
  responseErrors,
} from "../../schema";
import {
  classifyRegisterAgentConflict,
  RegisterAgentInput,
  writeAgentRegistration,
} from "../../utils";

export default async function agentRegisterRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: RegisterAgentInput }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        body: registerAgentBodySchema,
        response: { 201: registerAgentResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      try {
        const result = await writeAgentRegistration(request.body);

        // Fire-and-forget verification email — mirrors POST /user. A failed
        // send should not roll back the registration; the user can request a
        // resend separately.
        fastify.notify
          .emailVerification({
            id: result.userId,
            email: request.body.email,
          } as User)
          .catch((err) => {
            logger.error(
              `register-agent: verification email failed for user ${result.userId}: ${err instanceof Error ? err.message : err}`,
            );
          });

        return reply.status(201).send({
          message: "Agent registered. Check your inbox to verify the account.",
          data: { userId: result.userId, agentId: result.agentId },
        });
      } catch (err) {
        const conflictField = classifyRegisterAgentConflict(err);
        if (conflictField === "email") {
          return reply
            .status(409)
            .send({ message: "An account with this email already exists." });
        }
        if (conflictField === "title") {
          return reply
            .status(409)
            .send({ message: "An agent with this title already exists." });
        }
        // Don't echo the request body — contains personal data + credentials.
        logger.error(
          `register-agent: write failed: ${err instanceof Error ? err.message : err}`,
        );
        return reply.status(500).send({ message: "Failed to register agent." });
      }
    },
  );
}
