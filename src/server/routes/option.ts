import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { ApiOptionLists, EntityTableName, Lang } from "need4deed-sdk";
import { responseErrors } from "../schema";
import { RoutePrefix } from "../types";
import { getOptions, optionLists } from "../utils";

async function optionRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  const prefixedPath = options.prefix || RoutePrefix.OPTION;

  fastify.get<{
    Params: { list?: EntityTableName | "" };
    Querystring: { language?: Lang | "" };
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
            list: { type: "string", enum: ["", ...optionLists] },
          },
        },
        querystring: {
          type: "object",
          properties: {
            language: { type: "string", enum: ["", ...Object.values(Lang)] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "option-lists#" },
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
      const data = await getOptions(list || undefined, language || Lang.DE);

      return reply.status(200).send({
        message: `Options for ${list ? list : "all lists"}.`,
        data,
      });
    },
  );
}

export default fp(optionRoutes, {
  name: "option-routes",
});
