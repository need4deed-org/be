import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiEventN4DGetList, Lang, UserRole } from "need4deed-sdk";
import { dtoEventN4DGetList } from "../../services";
import { eventListQuerySchema, eventListResponseSchema } from "../schema";
import { getLanguageCode } from "../utils";

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
    Querystring: { language?: string };
    Reply: ApiEventN4DGetList[];
  }>(
    "/",
    {
      schema: {
        querystring: eventListQuerySchema,
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
        .map((event) => dtoEventN4DGetList(event, language))
        .filter((event): event is ApiEventN4DGetList => event !== null);

      return reply.status(200).send(data);
    },
  );
}
