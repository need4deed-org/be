import { FastifyInstance } from "fastify";
import type { ApiDistrictGeometryCollection } from "need4deed-sdk";
import { In } from "typeorm";
import districtGeometry from "../../../public/data/district-geometry.json";
import { districtGeometrySchemaResponseSchema } from "../schema/district-geometry.schema";

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
        response: districtGeometrySchemaResponseSchema,
      },
    },
    async (_request, reply) => {
      const titles = districtGeometry.features.map(
        ({ properties }) => properties.title,
      );

      const districts = await fastify.db.districtRepository.find({
        where: { title: In(titles) },
        select: { id: true, title: true },
      });

      const districtIdsByTitle = new Map(
        districts.map(({ title, id }) => [title, id]),
      );

      const features = districtGeometry.features.map((feature) => {
        const districtId = districtIdsByTitle.get(feature.properties.title);

        if (districtId === undefined) {
          throw new Error(
            `No district found for "${feature.properties.title}"`,
          );
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            districtId,
          },
        };
      });

      const data = {
        ...districtGeometry,
        features,
      } as ApiDistrictGeometryCollection;

      reply.status(200).send({
        message: "District geometry",
        data: data,
      });
    },
  );
}
