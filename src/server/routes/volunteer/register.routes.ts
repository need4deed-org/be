import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { UserRole } from "need4deed-sdk";
import {
  BadRequestError,
  UnauthenticatedError,
  UnauthorizedError,
} from "../../../config";
import {
  parserVolunteerSelfRegister,
  VolunteerSelfRegisterBody,
} from "../../../services/dto/parser-volunteer-self-register";
import {
  registerVolunteerQuerySchema,
  responseErrors,
  volunteerRegisterBodySchema,
} from "../../schema";
import { updateLeads, writeVolunteerLegacy } from "../../utils";

// Same DB-conflict-classification pattern as write-agent-registration.ts's
// classifyRegisterAgentConflict: the findOneBy check below is a fast path,
// not the guarantee — two concurrent submissions can both pass it before
// either commits, so the actual guarantee is the unique constraint added on
// volunteer.person_id (be#950 migration), and this catches its violation.
function isDuplicateVolunteerProfile(err: unknown): boolean {
  const e = err as { code?: string; detail?: string };
  return e?.code === "23505" && !!e.detail?.includes("person_id");
}

// Same pattern as agent/register.routes.ts's authByVerifyToken: authorizes via
// the email-verification JWT carried in the querystring (not a cookie/
// Bearer), not a logged-in session — the caller has only just verified their
// email, no session exists yet.
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

  if (user.role !== UserRole.VOLUNTEER && user.role !== UserRole.ADMIN) {
    throw new UnauthorizedError(
      "Only volunteer accounts can register a volunteer profile.",
    );
  }

  request.registrant = user;
}

export default async function volunteerRegisterRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{
    Body: VolunteerSelfRegisterBody;
    Querystring: { token: string };
    Reply: { message: string; data?: { id: number } };
  }>(
    "/",
    {
      config: { public: true } as FastifyContextConfig,
      schema: {
        querystring: registerVolunteerQuerySchema,
        body: volunteerRegisterBodySchema,
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: { id: { type: "number" } },
                required: ["id"],
              },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
      preHandler: (request, reply) =>
        authByVerifyToken(fastify, request, reply),
    },
    async (request, reply) => {
      const user = request.registrant;
      const person = user?.person;
      if (!person) {
        throw new BadRequestError("Account is missing a person record.");
      }

      const existing = await fastify.db.volunteerRepository.findOneBy({
        personId: person.id,
      });
      if (existing) {
        throw new BadRequestError(
          "A volunteer profile already exists for this account.",
        );
      }

      const { volunteer, leads } = await parserVolunteerSelfRegister(
        person,
        request.body,
      );

      let id: number;
      try {
        id = await writeVolunteerLegacy(volunteer);
      } catch (err) {
        if (isDuplicateVolunteerProfile(err)) {
          throw new BadRequestError(
            "A volunteer profile already exists for this account.",
          );
        }
        throw err;
      }
      if (leads.length) {
        await updateLeads(leads);
      }

      return reply.status(201).send({
        message: "Volunteer registration complete.",
        data: { id },
      });
    },
  );
}
