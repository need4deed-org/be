import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOrganizationGet,
  ApiOrganizationGetList,
  ApiOrganizationPatch,
  UserRole,
} from "need4deed-sdk";
import { UnauthorizedError } from "../../config";
import { idParamSchema, langQuerySchema, responseSchema } from "../schema";
import { ParamsId, ReplyData } from "../types";
import { getOrganizationProfile } from "../utils/data/get-organization-profile";
import { isStaffRole } from "../utils/data/is-staff-role";
import { listOrganizations } from "../utils/data/list-organizations";
import { patchOrganization } from "../utils/data/patch-organization";
import { editLanguage } from "../utils/data/request-language";

export default async function organizationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.get<{ Reply: ReplyData<ApiOrganizationGetList[]> }>(
    "/",
    {
      schema: { response: responseSchema("ApiOrganizationGetList#", true) },
    },
    async (_request, reply) =>
      reply.status(200).send({
        message: "Organizations found.",
        data: await listOrganizations(fastify),
      }),
  );

  fastify.get<{ Params: ParamsId; Reply: ReplyData<ApiOrganizationGet> }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        response: responseSchema("ApiOrganizationGet#"),
      },
    },
    async (request, reply) => {
      const role = request.authUser?.role;
      if (!isStaffRole(role) && role !== UserRole.AGENT) {
        throw new UnauthorizedError();
      }
      const { id } = request.params;
      return reply.status(200).send({
        message: `Organization (id:${id}) fetched successfully.`,
        data: await getOrganizationProfile(request, id),
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiOrganizationPatch;
    Reply: null;
  }>(
    "/:id",
    {
      preHandler: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        body: { $ref: "ApiOrganizationPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      await patchOrganization(
        request.params.id,
        request.body,
        editLanguage(request.query),
      );
      return reply.status(204).send();
    },
  );
}
