import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiAppreciationPatch,
  ApiEventN4DGet,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../config/error/fastify";
import { dtoEvent } from "../../services/dto/dto-event";
import { idParamSchema } from "../schema";
import {
  QuerystringPaginationLanguage,
  ReplyData,
} from "../types";
import { validatePermissions } from "../utils";

export default async function eventRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );
  fastify.get<{
    Reply: ReplyData<ApiEventN4DGet[]>;
    Querystring: QuerystringPaginationLanguage;
  }>("/", async (request, reply) => {
    const eventRepository = fastify.db.eventRepository;
    const relations = ["eventTranslation.language.isoCode"];
    const events = await eventRepository.find({ relations });
    const { language } = request.query;
    const data = events?.map((e) => dtoEvent(e, language));
    return reply.status(200).send({ message: "All events", data });
  });
  fastify.patch<{
    Params: { id: string };
    Body: ApiAppreciationPatch;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAppreciationPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiAppreciationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not updated.`,
        );
      }

      const updatedAppreciation = await appreciationRepository.save({
        ...appreciation,
        ...request.body,
      });

      return reply.status(200).send({
        message: `Appreciation with id:${id} updated.`,
        data: updatedAppreciation,
      });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not deleted.`,
        );
      }

      await appreciationRepository.remove(appreciation);

      return reply.status(200).send({
        message: `Appreciation with id:${id} deleted.`,
      });
    },
  );
}
