import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiEmailTemplatePut,
  EmailTemplateName,
  UserRole,
} from "need4deed-sdk";
import { cdnCacheSeconds } from "../../config";
import {
  getEmailTemplate,
  isEmailTemplateEditable,
  listEmailTemplates,
  saveEmailTemplate,
} from "../../services/notify/email-template-admin";
import {
  emailTemplateItemResponseSchema,
  emailTemplateListResponseSchema,
  emailTemplateParamsSchema,
  emailTemplatePutBodySchema,
  emailTemplateSaveResponseErrors,
  responseErrors,
} from "../schema";

type NameParams = { name: EmailTemplateName };

export default async function emailTemplateRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate({ role: UserRole.ADMIN }));

  fastify.get(
    "/",
    {
      schema: {
        response: { 200: emailTemplateListResponseSchema, ...responseErrors },
      },
    },
    async (_request, reply) => {
      const templates = await listEmailTemplates();
      return reply.status(200).send({
        message: `${templates.length} email templates.`,
        data: { editable: isEmailTemplateEditable(), templates },
      });
    },
  );

  fastify.get<{ Params: NameParams }>(
    "/:name",
    {
      schema: {
        params: emailTemplateParamsSchema,
        response: { 200: emailTemplateItemResponseSchema, ...responseErrors },
      },
    },
    async (request, reply) => {
      const { name } = request.params;
      return reply.status(200).send({
        message: `Email template "${name}".`,
        data: await getEmailTemplate(name),
      });
    },
  );

  fastify.put<{ Params: NameParams; Body: ApiEmailTemplatePut }>(
    "/:name",
    {
      schema: {
        params: emailTemplateParamsSchema,
        body: emailTemplatePutBodySchema,
        response: {
          200: emailTemplateItemResponseSchema,
          ...emailTemplateSaveResponseErrors,
        },
      },
    },
    async (request, reply) => {
      const { name } = request.params;
      const saved = await saveEmailTemplate(
        name,
        request.body,
        request.authUser!.id,
      );
      return reply.status(200).send({
        message: `Email template "${name}" saved. It reaches the CDN within ${cdnCacheSeconds / 60} minutes.`,
        data: { ...saved, cdnCacheSeconds },
      });
    },
  );
}
