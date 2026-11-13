import {
  FastifyContextConfig,
  FastifyInstance,
  FastifyPluginOptions,
} from "fastify";
import { ApiPostcodeCheck } from "need4deed-sdk";
import { normalizePostcode } from "../../data/utils/get-postcode";
import {
  postcodeCheckQuerySchema,
  postcodeCheckResponseSchema,
} from "../schema";

export default async function postcodeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.get<{
    Querystring: { code: string };
    Reply: { message: string; data: ApiPostcodeCheck };
  }>(
    "/check",
    {
      config: {
        public: true,
        rateLimit: { max: 30, timeWindow: "1 minute" },
      } as FastifyContextConfig,
      schema: {
        querystring: postcodeCheckQuerySchema,
        response: postcodeCheckResponseSchema,
      },
    },
    async (request, reply) => {
      const code = normalizePostcode(request.query.code);
      const known = await fastify.db.postcodeRepository.existsBy({
        value: code,
        isReference: true,
      });

      return reply
        .header("Cache-Control", "public, max-age=86400")
        .status(200)
        .send({ message: "Postcode check", data: { code, known } });
    },
  );
}
