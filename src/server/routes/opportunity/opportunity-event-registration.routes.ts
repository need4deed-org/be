import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { AgentMembershipStatus, UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { dtoOpportunityEventRegistration } from "../../../services";
import {
  idParamSchema,
  opportunityEventRegistrationListResponseSchema,
} from "../../schema";

// Only these roles may view an event's registrations at all. An AGENT is
// further scoped below to opportunities belonging to their own agent — the
// registrant's name/email/phone is PII, and be/CLAUDE.md only calls out
// COORDINATOR as PII-safe, so AGENT access is deliberately ownership-scoped
// rather than blanket (see be#879 discussion).
function assertHasRegistrationsRole(request: FastifyRequest): void {
  const role = request.authUser?.role;
  if (
    role !== UserRole.COORDINATOR &&
    role !== UserRole.AGENT &&
    role !== UserRole.ADMIN
  ) {
    throw new UnauthorizedError();
  }
}

async function assertCanViewRegistrations(
  fastify: FastifyInstance,
  request: FastifyRequest,
  agentId?: number,
): Promise<void> {
  const role = request.authUser?.role;
  if (role === UserRole.COORDINATOR || role === UserRole.ADMIN) {
    return;
  }

  const personId = request.authUser?.personId;
  const membership =
    personId && agentId
      ? await fastify.db.agentPersonRepository.findOneBy({
          agentId,
          personId,
          status: AgentMembershipStatus.ACTIVE,
        })
      : null;
  if (!membership) {
    throw new UnauthorizedError(
      "Agents can only view registrations for their own agent's opportunities.",
    );
  }
}

function toCsv(rows: string[][]): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

export default function opportunityEventRegistrationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: { id: number } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: opportunityEventRegistrationListResponseSchema,
      },
    },
    async (request, reply) => {
      assertHasRegistrationsRole(request);
      const opportunityId = request.params.id;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id: opportunityId },
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
      }
      await assertCanViewRegistrations(fastify, request, opportunity.agentId);

      const registrations =
        await fastify.db.opportunityEventRegistrationRepository.find({
          where: { opportunityId },
          order: { createdAt: "DESC" },
        });

      const totalPeople = registrations.reduce(
        (sum, r) => sum + r.numberOfPeople,
        0,
      );

      return reply.status(200).send({
        message: `Registrations for opportunity id:${opportunityId}.`,
        data: registrations.map(dtoOpportunityEventRegistration),
        count: registrations.length,
        totalPeople,
      });
    },
  );

  fastify.get<{ Params: { id: number } }>(
    "/export",
    { schema: { params: idParamSchema } },
    async (request, reply) => {
      assertHasRegistrationsRole(request);
      const opportunityId = request.params.id;

      const opportunity = await fastify.db.opportunityRepository.findOne({
        where: { id: opportunityId },
      });
      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
      }
      await assertCanViewRegistrations(fastify, request, opportunity.agentId);

      const registrations =
        await fastify.db.opportunityEventRegistrationRepository.find({
          where: { opportunityId },
          order: { createdAt: "DESC" },
        });

      const rows = [
        [
          "Name",
          "Email",
          "Phone",
          "People",
          "Language",
          "Message",
          "Registered at",
        ],
        ...registrations.map((r) => [
          r.fullName,
          r.email,
          r.phone ?? "",
          String(r.numberOfPeople),
          r.languagePreference ?? "",
          r.message ?? "",
          r.createdAt.toISOString(),
        ]),
      ];

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="registrations-${opportunityId}.csv"`,
      );
      return reply.send(toCsv(rows));
    },
  );
}
