import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentRegister,
  UserRole,
} from "need4deed-sdk";
import logger from "../../../logger";
import {
  registerAgentBodySchema,
  registerAgentConflictSchema,
  registerAgentQuerySchema,
  registerAgentResponseSchema,
  responseErrors,
} from "../../schema";
import {
  classifyRegisterAgentConflict,
  createAgentForPerson,
  joinAgent,
  resolveJoinStatus,
} from "../../utils";

export default async function agentRegisterRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{ Body: ApiAgentRegister; Querystring: { token: string } }>(
    "/",
    {
      // Public to the cookie/Bearer authenticate hook — this endpoint authorizes
      // via the verify JWT carried in the querystring instead (preHandler below).
      config: { public: true } as FastifyContextConfig,
      schema: {
        querystring: registerAgentQuerySchema,
        body: registerAgentBodySchema,
        response: {
          201: registerAgentResponseSchema,
          ...responseErrors,
          409: registerAgentConflictSchema,
        },
      },
      preHandler: async (request, reply) => {
        const { token } = request.query;

        let payload: { id: number; email: string; type?: string };
        try {
          payload = await fastify.jwt.verify(token);
        } catch {
          reply.status(401);
          throw new Error("Invalid or expired registration token.");
        }

        if (payload.type !== "verify") {
          reply.status(401);
          throw new Error("Invalid registration token.");
        }

        const user = await fastify.db.userRepository.findOne({
          where: { id: payload.id },
          relations: ["person"],
        });

        if (!user || !user.isActive) {
          reply.status(401);
          throw new Error("Account not found or not verified.");
        }

        if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) {
          reply.status(403);
          throw new Error("Only agent accounts can register an agent.");
        }

        request.registrant = user;
      },
    },
    async (request, reply) => {
      const user = request.registrant;
      const personId = user?.personId;
      if (!personId) {
        logger.error(
          `register-agent: registrant ${user?.id} has no linked person`,
        );
        return reply
          .status(500)
          .send({ message: "Account is missing a person record." });
      }

      const body = request.body;

      try {
        const result =
          "agentId" in body
            ? await joinAgent(
                personId,
                body.agentId,
                await resolveJoinStatus(body.agentId, user!.email),
              )
            : await createAgentForPerson(personId, body.agent);

        const message =
          result.membershipStatus === AgentMembershipStatus.PENDING
            ? "Join request submitted — an administrator will review it."
            : "Agent registration complete.";

        return reply.status(201).send({ message, data: result });
      } catch (err) {
        if (classifyRegisterAgentConflict(err) === "title") {
          const title = "agent" in body ? body.agent.title : undefined;
          const existing = title
            ? await fastify.db.agentRepository.findOne({ where: { title } })
            : null;
          return reply.status(409).send({
            message: "An agent with this title already exists.",
            conflict: "title",
            ...(existing ? { agentId: existing.id } : {}),
          });
        }
        // Don't echo the request body — may contain personal data.
        logger.error(
          `register-agent: write failed: ${err instanceof Error ? err.message : err}`,
        );
        return reply.status(500).send({ message: "Failed to register agent." });
      }
    },
  );
}
