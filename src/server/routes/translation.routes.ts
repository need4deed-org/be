import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiOriginalLanguagePut, UserRole } from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import { TranslatedEntityType } from "../../services/translation/registry";
import {
  confirmTranslation,
  getFieldTranslations,
} from "../../services/translation/review";
import {
  fieldTranslationsResponseSchema,
  idParamSchema,
  originalLanguageBodySchema,
  responseErrors,
  responseSchema,
  translationEntityParamSchema,
} from "../schema";
import { ParamsId } from "../types";

interface ParamsEntity {
  entityType: TranslatedEntityType;
  entityId: number;
}

export default async function translationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.get<{ Params: ParamsEntity }>(
    "/:entityType/:entityId",
    {
      schema: {
        params: translationEntityParamSchema,
        response: { 200: fieldTranslationsResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { entityType, entityId } = request.params;
      const data = await getFieldTranslations(
        dataSource.manager,
        entityType,
        entityId,
      );
      return reply.status(200).send({
        message: `${data.length} translated fields of ${entityType} (id:${entityId}).`,
        data,
      });
    },
  );

  fastify.post<{ Params: ParamsId }>(
    "/:id/confirm",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      await confirmTranslation(dataSource.manager, request.params.id);
      return reply.status(204).send();
    },
  );

  fastify.put<{ Params: ParamsEntity; Body: ApiOriginalLanguagePut }>(
    "/:entityType/:entityId/original-language",
    {
      schema: {
        params: translationEntityParamSchema,
        body: originalLanguageBodySchema,
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { entityType, entityId } = request.params;
      await dataSource.manager.transaction((manager) =>
        fastify.translation.setOriginalLanguage(
          manager,
          entityType,
          entityId,
          request.body.language,
        ),
      );
      return reply.status(204).send();
    },
  );
}
