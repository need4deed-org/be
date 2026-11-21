import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiEventN4DRegistrationListGet, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../config";
import EventN4DRegistration from "../../data/entity/event/event-n4d-registration.entity";
import { dtoEventN4DRegistration } from "../../services";
import {
  eventN4DRegistrationListResponseSchema,
  idParamSchema,
} from "../schema";
import { ParamsId, ReplyData } from "../types";

function csvCell(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /["\r\n,]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export default async function eventN4DRegistrationListRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const findRegistrations = async (
    eventId: number,
  ): Promise<EventN4DRegistration[]> => {
    if (!(await fastify.db.eventRepository.existsBy({ id: eventId }))) {
      throw new NotFoundError(`Event (id:${eventId}) not found.`);
    }
    return fastify.db.eventN4DRegistrationRepository.find({
      where: { eventId },
      order: { createdAt: "DESC", id: "DESC" },
    });
  };

  fastify.get<{
    Params: ParamsId;
    Reply: ReplyData<ApiEventN4DRegistrationListGet>;
  }>(
    "/",
    {
      preHandler: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: eventN4DRegistrationListResponseSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const registrations = await findRegistrations(id);

      return reply.status(200).send({
        message: `Registrations for event id:${id}.`,
        data: {
          registrations: registrations.map(dtoEventN4DRegistration),
          totalPeople: registrations.reduce(
            (sum, registration) => sum + registration.numberOfPeople,
            0,
          ),
        },
      });
    },
  );

  fastify.get<{ Params: ParamsId }>(
    "/export",
    {
      preHandler: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: { params: idParamSchema },
    },
    async (request, reply) => {
      const { id } = request.params;
      const registrations = await findRegistrations(id);
      const event = await fastify.db.eventRepository.findOneByOrFail({ id });
      const question = event.signUpQuestion;

      const rows = [
        [
          "Name",
          "Email",
          "People",
          ...(question ? [question] : []),
          "Message",
          "Volunteers with refugees",
          "Attended",
          "Registered at",
        ],
        ...registrations.map((r) => [
          r.fullName,
          r.email,
          String(r.numberOfPeople),
          ...(question ? [r.signUpAnswer ?? ""] : []),
          r.message ?? "",
          r.isVolunteer ? r.volunteerTypes.join(" ") || "yes" : "no",
          r.attended ? "yes" : "no",
          r.createdAt.toISOString(),
        ]),
      ];

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="registrations-event-${id}.csv"`,
      );
      return reply.send(toCsv(rows));
    },
  );
}
