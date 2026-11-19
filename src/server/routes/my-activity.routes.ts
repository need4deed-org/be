import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiMyActivityItem,
  ApiMyActivityQuery,
  MyActivityKind,
  UserRole,
} from "need4deed-sdk";
import { responseErrors } from "../schema/responseErrors";
import { ReplyData } from "../types";
import { getMyActivity } from "../utils/data/get-my-activity";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const myActivityItemSchema = {
  type: "object",
  required: [
    "id",
    "kind",
    "occurredAt",
    "entityType",
    "entityId",
    "entityTitle",
    "text",
  ],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    kind: { type: "string", enum: Object.values(MyActivityKind) },
    occurredAt: { type: "string", format: "date-time" },
    entityType: { type: "string" },
    entityId: { type: "integer" },
    entityTitle: { type: "string" },
    text: { type: "string" },
    changeType: { type: "string" },
  },
};

export default async function myActivityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: ApiMyActivityQuery;
    Reply: ReplyData<ApiMyActivityItem[]>;
  }>(
    "/me/activity",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer", minimum: 1, maximum: MAX_LIMIT },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["message", "data"],
            properties: {
              message: { type: "string" },
              data: { type: "array", items: myActivityItemSchema },
            },
          },
          ...responseErrors,
        },
      },
      onRequest: [fastify.authenticate({ role: UserRole.COORDINATOR })],
    },
    async (request, reply) => {
      const data = await getMyActivity(
        request.authUser!.id,
        request.query.limit ?? DEFAULT_LIMIT,
      );
      return reply.status(200).send({ message: "My recent activity", data });
    },
  );
}
