import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { AgentMembershipStatus, UserRole } from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../../config";
import OpportunityEventRegistration from "../../../data/entity/opportunity-event-registration.entity";
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
    personId !== undefined && agentId !== undefined
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

// Shared by both handlers below so the role gate, 404, and ownership check
// can't drift apart between the JSON list and the CSV export.
async function getAuthorizedRegistrations(
  fastify: FastifyInstance,
  request: FastifyRequest,
  opportunityId: number,
): Promise<OpportunityEventRegistration[]> {
  assertHasRegistrationsRole(request);

  const opportunity = await fastify.db.opportunityRepository.findOne({
    where: { id: opportunityId },
  });
  if (!opportunity) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
  await assertCanViewRegistrations(fastify, request, opportunity.agentId);

  return fastify.db.opportunityEventRegistrationRepository.find({
    where: { opportunityId },
    order: { createdAt: "DESC" },
  });
}

function csvCell(value: string): string {
  // Neutralize formula injection (OWASP CSV injection): fullName/message
  // come from the public, unauthenticated POST /event-registration form, and
  // a leading =, +, -, or @ is interpreted as a live formula by Excel/Sheets
  // once a coordinator/agent opens this export.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /["\r\n,]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
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
      const opportunityId = request.params.id;
      const registrations = await getAuthorizedRegistrations(
        fastify,
        request,
        opportunityId,
      );

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
      const opportunityId = request.params.id;
      const registrations = await getAuthorizedRegistrations(
        fastify,
        request,
        opportunityId,
      );

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
        ...registrations
          .map(dtoOpportunityEventRegistration)
          .map((r) => [
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
