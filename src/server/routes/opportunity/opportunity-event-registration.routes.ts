import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { NotFoundError } from "../../../config";
import OpportunityEventRegistration from "../../../data/entity/opportunity-event-registration.entity";
import { dtoOpportunityEventRegistration } from "../../../services";
import {
  idParamSchema,
  opportunityEventRegistrationListResponseSchema,
} from "../../schema";
import { assertAgentMemberOrStaffOr403, assertRoleIn } from "../../utils";

async function getAuthorizedRegistrations(
  fastify: FastifyInstance,
  request: FastifyRequest,
  opportunityId: number,
): Promise<OpportunityEventRegistration[]> {
  assertRoleIn(request);

  const opportunity = await fastify.db.opportunityRepository.findOne({
    where: { id: opportunityId },
  });
  if (!opportunity) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
  await assertAgentMemberOrStaffOr403(
    request,
    opportunity.agentId,
    "Agents can only view registrations for their own agent's opportunities.",
  );

  return fastify.db.opportunityEventRegistrationRepository.find({
    where: { opportunityId },
    order: { createdAt: "DESC" },
  });
}

function csvCell(value: string): string {
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
