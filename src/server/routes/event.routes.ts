import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiEventN4DCreate,
  ApiEventN4DGet,
  ApiEventN4DGetList,
  ApiEventN4DPatch,
  Lang,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { dtoEventN4DGet, dtoEventN4DGetList } from "../../services";
import {
  eventCreateBodySchema,
  eventCreateResponseSchema,
  eventListResponseSchema,
  eventPatchBodySchema,
  idParamSchema,
  langQuerySchema,
  responseSchema,
} from "../schema";
import {
  ParamsId,
  QuerystringEventGetList,
  ReplyData,
  ReplyDataCount,
  ReplyMessage,
} from "../types";
import {
  createEvent,
  getLanguageCode,
  isStaffRole,
  updateEvent,
} from "../utils";

export default async function eventRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: QuerystringEventGetList;
    Reply: ReplyDataCount<ApiEventN4DGetList[]>;
  }>(
    "/",
    {
      schema: {
        querystring: langQuerySchema,
        response: eventListResponseSchema,
      },
      onRequest: fastify.tryAuthenticate(),
    },
    async (request, reply) => {
      const role = request.authUser?.role;
      const isPrivileged = isStaffRole(role);
      const language = getLanguageCode(request.query.language) || Lang.DE;

      const events = await fastify.db.eventRepository.find({
        where: isPrivileged ? {} : { isActive: true },
        relations: ["eventTranslation.language"],
        order: { date: "ASC" },
      });

      const data = events
        .map((event) => dtoEventN4DGetList(event, language, isPrivileged))
        .filter((event): event is ApiEventN4DGetList => event !== null);

      return reply
        .status(200)
        .send({ message: "Events.", data, count: data.length });
    },
  );

  fastify.post<{
    Body: ApiEventN4DCreate;
    Reply: ReplyData<ApiEventN4DGet>;
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        body: eventCreateBodySchema,
        response: eventCreateResponseSchema,
      },
    },
    async (request, reply) => {
      const created = await createEvent(request.body);

      const event = await fastify.db.eventRepository.findOne({
        where: { id: created.id },
        relations: ["eventTranslation.language"],
      });
      if (!event) {
        throw new NotFoundError(`Event (id:${created.id}) not found.`);
      }

      const data = dtoEventN4DGet(
        event,
        request.body.translations[0].language,
        true,
      )!;

      return reply.status(201).send({ message: "Event created.", data });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiEventN4DPatch;
    Reply: null;
  }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: eventPatchBodySchema,
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      await updateEvent(request.params.id, request.body);
      return reply.status(204).send();
    },
  );

  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const eventRepository = fastify.db.eventRepository;
      const event = await eventRepository.findOneBy({ id });

      if (!event) {
        throw new NotFoundError(`Event (id:${id}) not found.`);
      }

      await eventRepository.delete({ id });

      return reply.status(200).send({
        message: `Event (id:${id}) deleted successfully`,
      });
    },
  );
}
