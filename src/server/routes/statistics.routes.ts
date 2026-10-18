import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiStatisticsQuery, StatisticsMetric, UserRole } from "need4deed-sdk";
import {
  responseErrors,
  statisticsParamsSchema,
  statisticsQuerySchema,
  statisticsResponseSchema,
} from "../schema";
import { getStatistics } from "../utils";

export default async function statisticsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Params: { metric: StatisticsMetric };
    Querystring: ApiStatisticsQuery;
  }>(
    "/:metric",
    {
      preHandler: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: statisticsParamsSchema,
        querystring: statisticsQuerySchema,
        response: { 200: statisticsResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { metric } = request.params;
      const data = await getStatistics(metric, request.query);
      return reply.status(200).send({
        message: `Statistics for ${metric} by ${data.granularity}.`,
        data,
      });
    },
  );
}
