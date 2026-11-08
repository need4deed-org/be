import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiVolunteerSuggestionRequestPost } from "need4deed-sdk";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { requestVolunteerSuggestion } from "../../utils/data/request-volunteer-suggestion";

export default async function volunteerSuggestionRequestRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.post<{
    Params: ParamsId;
    Body: ApiVolunteerSuggestionRequestPost;
    Reply: ReplyMessage;
  }>(
    "/",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerSuggestionRequestPost#" },
        response: responseSchema({ statusCode: 201 }),
      },
    },
    async (request, reply) => {
      await requestVolunteerSuggestion(
        request,
        request.params.id,
        request.body.opportunityId,
      );
      return reply.status(201).send({
        message: "Suggestion request sent to the volunteer's NGO.",
      });
    },
  );
}
