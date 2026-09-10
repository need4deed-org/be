import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config";
import { dtoVolunteerAuditLog } from "../../../services/dto/dto-volunteer-audit-log";
import { idParamSchema } from "../../schema";

// Read-only audit trail for a volunteer's own record (be#919). Same
// self-access shape as GET /volunteer/:id/doc (be#967): COORDINATOR/ADMIN
// see any volunteer's log, a VOLUNTEER only their own.
export default function volunteerAuditLogRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: { id: number } }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    volunteerId: { type: "number" },
                    type: { type: "string" },
                    detail: { type: "string" },
                    actorUserId: { type: ["number", "null"] },
                    occurredAt: { type: "string", format: "date-time" },
                  },
                  required: [
                    "id",
                    "volunteerId",
                    "type",
                    "detail",
                    "occurredAt",
                  ],
                },
              },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = request.params.id;
      const role = request.authUser?.role;

      if (role !== UserRole.COORDINATOR && role !== UserRole.ADMIN) {
        const volunteer = await fastify.db.volunteerRepository.findOneBy({
          id,
        });
        const isSelf =
          role === UserRole.VOLUNTEER &&
          request.authUser?.personId !== undefined &&
          request.authUser?.personId !== null &&
          volunteer?.personId === request.authUser.personId;
        if (!isSelf) {
          throw new UnauthorizedError();
        }
      }

      const entries = await fastify.db.volunteerAuditLogRepository.find({
        where: { volunteerId: id },
        order: { occurredAt: "DESC" },
      });

      return reply.send({
        message: `Activity log for volunteer ${id}`,
        data: entries.map(dtoVolunteerAuditLog),
      });
    },
  );
}
