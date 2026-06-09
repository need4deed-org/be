import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  AgentMembershipStatus,
  ApiAgentRegister,
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
} from "../../schema";
import {
  classifyRegisterAgentConflict,
  createAgentForPerson,
  joinAgent,
  resolveJoinStatus,
} from "../../utils";

// Authorizes the registration routes via the email-verification JWT carried in
// the querystring (not a cookie/Bearer). Resolves the verified user and attaches
// it as request.registrant. Throws typed errors so the status code is correct.
async function authByVerifyToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const { token } = request.query as { token?: string };

  let payload: { id: number; email: string; type?: string };
  try {
    payload = await fastify.jwt.verify(token as string);
  } catch {
    throw new UnauthenticatedError("Invalid or expired registration token.");
  }

  if (payload.type !== "verify") {
    throw new UnauthenticatedError("Invalid registration token.");
  }

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
  // GET /agent/register/search?token=&street= — minimal agent lookup for the
  // self-registration picker, so a registrant can JOIN their org instead of
  // creating a duplicate. Token-gated (not the COORDINATOR-only GET /agent).
  fastify.get<{ Querystring: { token: string; street?: string } }>(
    "/search",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        querystring: registerSearchQuerySchema,
        response: { 200: registerSearchResponseSchema, ...responseErrors },
      },
      preHandler: (request, reply) =>
        authByVerifyToken(fastify, request, reply),
    },
    async (request, reply) => {
      const street = (request.query.street ?? "").trim();
      const domain = request.registrant?.email.split("@").pop()?.toLowerCase();
      if (street.length < 3 || !domain) {
        return reply.status(200).send({ message: "No query", data: [] });
      }

      // Only surface agents the registrant is tied to by email domain — i.e.
      // an existing member shares their domain (Person.email, falling back to
      // the linked User.email). This keeps the picker to orgs they can join and
      // narrows enumeration. Mirrors resolveJoinStatus, so a picked agent
      // auto-approves to ACTIVE.
      const rows = await fastify.db.agentRepository
        .createQueryBuilder("agent")
        .select("agent.id", "id")
        .addSelect("agent.title", "title")
        .distinct(true)
        .innerJoin("agent.address", "address")
        .innerJoin("agent.agentPerson", "ap")
        .innerJoin("ap.person", "person")
        .leftJoin("person.users", "usr")
        .where("address.street ILIKE :street", { street: `%${street}%` })
        .andWhere("(person.email ILIKE :suffix OR usr.email ILIKE :suffix)", {
          suffix: `%@${domain}`,
        })
        .limit(10)
        .getRawMany<{ id: number; title: string }>();

      const data = rows.map((row) => ({
        id: Number(row.id),
        title: row.title,
      }));
      return reply
        .status(200)
        .send({ message: `Found ${data.length} matches`, data });
    },
  );

  fastify.post<{ Body: ApiAgentRegister; Querystring: { token: string } }>(
    "/",
    {
      // Public to the cookie/Bearer authenticate hook — authorized via the
      // verify JWT in the querystring (preHandler below).
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
