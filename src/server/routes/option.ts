import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { ApiOptionLists, EntityTableName } from "need4deed-sdk";

import { Lang } from "need4deed-sdk";
import { optionListsSchema, responseErrors } from "../schema";
import { RoutePrefix } from "../types";
import { getOptions } from "../utils";

async function optionRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.OPTION;

  fastify.get<{
    Params: { list?: EntityTableName };
    Querystring: { language: Lang };
    Reply: {
      message: string;
      data?: ApiOptionLists;
    };
  }>(
    `${prefixedPath}/:list?`,
    {
      schema: {
        params: {
          type: "object",
          properties: {
            list: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: optionListsSchema,
            },
            required: ["message", "data"],
          },
        },
        ...responseErrors,
      },
    },
    async (request, reply) => {
      const { list } = request.params;
      const { language } = request.query;
      try {
        const data = await getOptions(list, language || Lang.DE);

        return reply.status(200).send({
          message: `Options for ${list ? list : "all lists"}.`,
          data,
        });
      } catch (error) {
        fastify.log.error(`Error: ${error}`);
        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
}

export default fp(optionRoutes, {
  name: "option-routes",
});
