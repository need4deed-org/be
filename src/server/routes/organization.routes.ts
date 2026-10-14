import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOrganizationGetList,
  ApiOrganizationPatch,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { idParamSchema, responseSchema } from "../schema";
import { ParamsId, ReplyData } from "../types";
import { listOrganizations } from "../utils/data/list-organizations";

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
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const organizationRepository = fastify.db.organizationRepository;
      const organization = await organizationRepository.findOneBy({ id });

      if (!organization) {
        throw new NotFoundError(`Organization (id:${id}) not found.`);
      }

      const organizationPatched = Object.assign(organization, request.body);

      await organizationRepository.save(organizationPatched);

      return reply.status(204).send();
    },
  );
}
