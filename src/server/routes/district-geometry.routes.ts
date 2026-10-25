import { FastifyInstance } from "fastify";
import type {
  ApiDistrictGeometry,
  ApiDistrictGeometryCollection,
} from "need4deed-sdk";
import { In } from "typeorm";
import districtGeometry from "../../../public/data/district-geometry.json";
import logger from "../../logger";
import { districtGeometryResponseSchema } from "../schema/district-geometry.schema";

let cachedFeatures: ApiDistrictGeometryCollection["features"] | undefined;

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
        response: districtGeometryResponseSchema,
      },
    },
    async (_request, reply) => {
      let features = cachedFeatures;

      if (!features) {
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
        const resolvedFeatures: ApiDistrictGeometryCollection["features"] = [];
        let hasMissingDistricts = false;

        for (const feature of districtGeometry.features) {
          const districtId = districtIdsByTitle.get(feature.properties.title);

          if (districtId === undefined) {
            logger.warn(
              `District geometry skipped: no district found for "${feature.properties.title}"`,
            );
            hasMissingDistricts = true;
            continue;
          }

          resolvedFeatures.push({
            ...feature,
            type: "Feature",
            geometry: feature.geometry as ApiDistrictGeometry,
            properties: {
              ...feature.properties,
              districtId,
            },
          });
        }

        if (!hasMissingDistricts) {
          cachedFeatures = resolvedFeatures;
        }

        features = resolvedFeatures;
      }

      const data: ApiDistrictGeometryCollection = {
        ...districtGeometry,
        type: "FeatureCollection",
        features,
      };

      reply.header("Cache-Control", "public, max-age=3600").status(200).send({
        message: "District geometry",
        data,
      });
    },
  );
}
