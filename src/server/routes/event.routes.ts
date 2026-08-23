import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiEventN4DCreate,
  ApiEventN4DGetList,
  Lang,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { dtoEventN4DGetList } from "../../services";
import {
  eventCreateBodySchema,
  eventCreateResponseSchema,
  eventListResponseSchema,
  langQuerySchema,
} from "../schema";
import { QuerystringEventGetList, ReplyData, ReplyDataCount } from "../types";
import { createEvent, getLanguageCode } from "../utils";

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
    Reply: ReplyData<ApiEventN4DGetList>;
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
      // dtoEventN4DGetList's null branch is unreachable here — it only
      // returns null for a non-privileged caller. Echoes back in whichever
      // language was submitted first.
      const data = dtoEventN4DGetList(
        event,
        request.body.translations[0].language,
        true,
      )!;

      return reply.status(201).send({ message: "Event created.", data });
    },
  );
}
