import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiFieldTranslationPatch,
  ApiFieldTranslationPost,
  TranslatedEntityType,
  UserRole,
} from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import {
  createTranslation,
  deleteTranslation,
  editTranslation,
  getFieldTranslations,
} from "../../services/translation/review";
import {
  fieldTranslationPatchBodySchema,
  fieldTranslationPostBodySchema,
  fieldTranslationResponseSchema,
  fieldTranslationsResponseSchema,
  idParamSchema,
  responseErrors,
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

  fastify.post<{ Body: ApiFieldTranslationPost }>(
    "/",
    {
      schema: {
        body: fieldTranslationPostBodySchema,
        response: { 201: fieldTranslationResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const data = await createTranslation(dataSource.manager, request.body);
      return reply.status(201).send({
        message: `Translation (id:${data.id}) created.`,
        data,
      });
    },
  );

  fastify.patch<{ Params: ParamsId; Body: ApiFieldTranslationPatch }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: fieldTranslationPatchBodySchema,
        response: { 200: fieldTranslationResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const data = await editTranslation(
        dataSource.manager,
        request.params.id,
        request.body,
      );
      return reply.status(200).send({
        message: `Translation (id:${data.id}) saved.`,
        data,
      });
    },
  );

  fastify.delete<{ Params: ParamsId }>(
    "/:id",
    {
      schema: {
        description:
          "Resets machine-entity translations to pending without clearing retry attempts. Already-pending translations are unchanged; exhausted translations return 409. Reference translations are permanently deleted.",
        params: idParamSchema,
        response: { 204: { type: "null" }, ...responseErrors },
      },
    },
    async (request, reply) => {
      await deleteTranslation(dataSource.manager, request.params.id);
      return reply.status(204).send();
    },
  );
}
