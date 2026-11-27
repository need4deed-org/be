import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerEventN4DGet, Lang } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import { dtoVolunteerEventN4D } from "../../../services";
import {
  idParamSchema,
  langQuerySchema,
  volunteerEventN4DListResponseSchema,
} from "../../schema";
import { ParamsId, QuerystringEventGet, ReplyData } from "../../types";
import {
  assertCoordinatorOrGroupCoordinator,
  getLanguageCode,
} from "../../utils";

export default async function volunteerEventsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: ParamsId;
    Querystring: QuerystringEventGet;
    Reply: ReplyData<ApiVolunteerEventN4DGet[]>;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        response: volunteerEventN4DListResponseSchema,
      },
    },
    async (request, reply) => {
      await assertCoordinatorOrGroupCoordinator(request);
      const { id } = request.params;
      const language = getLanguageCode(request.query.language) || Lang.DE;

      if (!(await fastify.db.volunteerRepository.existsBy({ id }))) {
        throw new NotFoundError(`Volunteer (id:${id}) not found.`);
      }

      const registrations =
        await fastify.db.eventN4DRegistrationRepository.find({
          where: { volunteerId: id },
          relations: ["event.eventTranslation.language"],
          order: { event: { date: "DESC" }, id: "DESC" },
        });

      return reply.status(200).send({
        message: `Events of volunteer id:${id}.`,
        data: registrations.map((registration) =>
          dtoVolunteerEventN4D(registration, language),
        ),
      });
    },
  );
}
