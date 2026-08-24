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
} from "../types";
import { createEvent, getLanguageCode, updateEvent } from "../utils";

export default async function eventRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GET /event — public list of events (be#903). Anonymous/non-privileged
  // callers see only active events; a logged-in coordinator/admin sees
  // everything, since the dashboard needs to manage drafts/deactivated
  // events too. tryAuthenticate() (not authenticate()) is what makes a
  // single public route able to vary by caller: it best-effort resolves
  // request.authUser from a cookie if one is present, but never requires it.
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
      const isPrivileged =
        role === UserRole.COORDINATOR || role === UserRole.ADMIN;
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

  // POST /event — coordinator create (be#904). Structural fields + one
  // EventTranslation row per submitted language.
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

      // isPrivileged: true (this route is COORDINATOR-gated) means
      // dtoEventN4DGet's null branch is unreachable here — it only returns
      // null for a non-privileged caller. Echoes back in whichever language
      // was submitted first.
      const data = dtoEventN4DGet(
        event,
        request.body.translations[0].language,
        true,
      )!;

      return reply.status(201).send({ message: "Event created.", data });
    },
  );

  // PATCH /event/:id — coordinator update (be#905). Structural fields are a
  // plain partial update; translations is an upsert per (event, language) —
  // see write-event.ts's updateEvent for the exact semantics.
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
}
