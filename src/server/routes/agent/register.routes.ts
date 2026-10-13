import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  ApiAgentRegister,
  ApiOrganizationGetList,
  UserRole,
} from "need4deed-sdk";
import { UnauthenticatedError, UnauthorizedError } from "../../../config";
import logger from "../../../logger";
import {
  registerAgentBodySchema,
  registerAgentConflictSchema,
  registerAgentQuerySchema,
  registerAgentResponseSchema,
  registerSearchQuerySchema,
  registerSearchResponseSchema,
  responseErrors,
  responseSchema,
} from "../../schema";
import { ReplyData } from "../../types";
import {
  createAgentForPerson,
  getAgentIdsJoinableAsActive,
  isExactStreetMatch,
  joinAgent,
  resolveJoinStatus,
  searchAgentCandidates,
  verifyTokenOfType,
} from "../../utils";
import { listOrganizations } from "../../utils/data/list-organizations";

async function authByVerifyToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const { token } = request.query as { token?: string };

  const payload = await verifyTokenOfType<{ id: number; email: string }>(
    fastify,
    token,
    "verify",
    "Invalid or expired registration token.",
    "Invalid registration token.",
  );

  const user = await fastify.db.userRepository.findOne({
    where: { id: payload.id },
    relations: ["person"],
  });

  if (!user || !user.isActive) {
    throw new UnauthenticatedError("Account not found or not verified.");
  }

  if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) {
    throw new UnauthorizedError("Only agent accounts can register an agent.");
  }

  request.registrant = user;
}

export default async function agentRegisterRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: { token: string };
    Reply: ReplyData<ApiOrganizationGetList[]>;
  }>(
    "/organizations",
    {
      config: {
        public: true,
        rateLimit: { max: 30, timeWindow: "1 minute" },
      } as FastifyContextConfig,
      schema: {
        querystring: {
          type: "object",
          required: ["token"],
          properties: { token: { type: "string" } },
        },
        response: responseSchema("ApiOrganizationGetList#", true, false),
      },
      preHandler: (request, reply) =>
        authByVerifyToken(fastify, request, reply),
    },
    async (_request, reply) =>
      reply.status(200).send({
        message: "Organizations found.",
        data: await listOrganizations(),
      }),
  );

  fastify.get<{
    Querystring: { token: string; street?: string };
  }>(
    "/search",
    {
      config: {
        public: true,
        rateLimit: { max: 30, timeWindow: "1 minute" },
      } as FastifyContextConfig,
      schema: {
        querystring: registerSearchQuerySchema,
        response: { 200: registerSearchResponseSchema, ...responseErrors },
      },
      preHandler: (request, reply) =>
        authByVerifyToken(fastify, request, reply),
    },
    async (request, reply) => {
      const street = (request.query.street ?? "").trim();
      if (street.length < 3) {
        return reply.status(200).send({ message: "No query", data: [] });
      }

      const candidates = await fastify.db.agentRepository
        .createQueryBuilder("agent")
        .leftJoinAndSelect("agent.address", "address")
        .where("agent.unclaimed = :unclaimed", { unclaimed: false })
        .andWhere("agent.engagementStatus != :inactive", {
          inactive: AgentEngagementStatusType.INACTIVE,
        })
        .getMany();

      const matches = searchAgentCandidates(candidates, street);
      const joinable = await getAgentIdsJoinableAsActive(
        request.registrant?.email ?? "",
        matches.map((a) => a.id),
      );
      // be#1041: an agent whose title the registrant can't see is returned
      // (as { id }) only for its exact street and house number. A prefix
      // match would let a registrant list orgs street by street, and an
      // addressless agent matches on its title, which would leak it
      // substring by substring.
      const data = matches
        .filter((a) => joinable.has(a.id) || isExactStreetMatch(a, street))
        .map((a) =>
          joinable.has(a.id) ? { id: a.id, title: a.title } : { id: a.id },
        );
      return reply
        .status(200)
        .send({ message: `Found ${data.length} matches`, data });
    },
  );

  fastify.post<{ Body: ApiAgentRegister; Querystring: { token: string } }>(
    "/",
    {
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
      preHandler: (request, reply) =>
        authByVerifyToken(fastify, request, reply),
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
    },
  );
}
