import { FastifyInstance } from "fastify";
import type { ApiDistrictGeometryCollection } from "need4deed-sdk";
import districtGeometry from "../../../public/data/district-geometry.json";
import { responseErrors } from "../schema";
import { districtGeometrySchema } from "../schema/district-geometry.schema";

const districtGeometryData = districtGeometry as ApiDistrictGeometryCollection;

export default async function districtGeometryRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Reply: {
      message: string;
      data: ApiDistrictGeometryCollection;
    };
  }>(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: districtGeometrySchema,
            },
            required: ["message", "data"],
          },
        },
        ...responseErrors,
      },
    },
    async (_request, reply) =>
      reply.status(200).send({
        message: "District geometry",
        data: districtGeometryData,
      }),
  );
}
