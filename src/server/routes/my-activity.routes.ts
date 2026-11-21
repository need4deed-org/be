import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiMyActivityItem, ApiMyActivityQuery, UserRole } from "need4deed-sdk";
import {
  MY_ACTIVITY_DEFAULT_LIMIT,
  myActivityGetSchema,
} from "../schema/my-activity.schema";
import { ReplyData } from "../types";
import { getMyActivity } from "../utils/data/get-my-activity";

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
      schema: myActivityGetSchema,
      onRequest: [fastify.authenticate({ role: UserRole.COORDINATOR })],
    },
    async (request, reply) => {
      const data = await getMyActivity(
        request.authUser!.id,
        request.query.limit ?? MY_ACTIVITY_DEFAULT_LIMIT,
      );
      return reply.status(200).send({ message: "My recent activity", data });
    },
  );
}
