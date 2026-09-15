import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerCommunicationPost, UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config";
import { dtoCommunication } from "../../../services/dto/dto-communication";
import { idParamSchema } from "../../schema";

export default function volunteerCommunicationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{ Params: { id: string } }>(
    "/",
    {
      // onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { type: "array", items: { $ref: "ApiCommunicationGet#" } },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);
      const volunteerRepository = fastify.db.volunteerRepository;
      const id = volunteerId;
      const volunteer = await volunteerRepository.findOneByOrFail({
        id,
      });

      const role = request.authUser?.role;
      const isSelf =
        role === UserRole.VOLUNTEER &&
        request.authUser?.personId !== undefined &&
        request.authUser?.personId !== null &&
        request.authUser.personId === volunteer.personId;
      if (role !== UserRole.COORDINATOR && role !== UserRole.ADMIN && !isSelf) {
        throw new UnauthorizedError();
      }

      const communications = await fastify.db.communicationRepository.find({
        where: { volunteerId },
      });

      return reply.status(200).send({
        message: `List of communications for volunteer_id:${volunteerId}`,
        data: communications.map(dtoCommunication),
      });
    },
  );

  fastify.post<{ Params: { id: number }; Body: ApiVolunteerCommunicationPost }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiCommunicationPost#" },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiCommunicationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const volunteerId = Number(request.params.id);

      const communication = await fastify.db.communicationRepository.save({
        ...request.body,
        userId: request.user.id,
        volunteerId,
      });

      return reply.status(201).send({
        message: `Communication created for volunteer_id:${volunteerId}`,
        data: dtoCommunication(communication),
      });
    },
  );
}
