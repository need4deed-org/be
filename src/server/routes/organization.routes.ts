import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { ApiOrganizationPatch, UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../config";
import { idParamSchema, responseSchema } from "../schema";
import { ParamsId, ReplyMessage } from "../types";

export default async function organizationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiOrganizationPatch;
    Reply: ReplyMessage;
  }>(
    "/:id",
    {
      schema: { params: idParamSchema, response: responseSchema("") },
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

      return reply
        .status(200)
        .send({ message: `Organization (id:${id} has been patched.)` });
    },
  );
}
