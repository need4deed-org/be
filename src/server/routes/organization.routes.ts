import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOrganizationGetList,
  ApiOrganizationPatch,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { dtoOrganizationGetList } from "../../services";
import { idParamSchema, responseSchema } from "../schema";
import { ParamsId, ReplyData } from "../types";

export default async function organizationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GET is open to any logged-in user — it's just a dropdown of organization
  // names (e.g. for the agent "operator" picker, be#843), no PII. Writes stay
  // COORDINATOR-only, gated per-route below.
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.get<{ Reply: ReplyData<ApiOrganizationGetList[]> }>(
    "/",
    {
      schema: { response: responseSchema("ApiOrganizationGetList#", true) },
    },
    async (_request, reply) => {
      const organizations = await fastify.db.organizationRepository.find({
        order: { title: "ASC" },
      });

      return reply.status(200).send({
        message: "Organizations found.",
        data: organizations.map(dtoOrganizationGetList),
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
