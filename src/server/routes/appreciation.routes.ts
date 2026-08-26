import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiAppreciationPatch,
  AppreciationStatusType,
  UserRole,
} from "need4deed-sdk";
import { NotFoundError, UnauthorizedError } from "../../config/error/fastify";
import { idParamSchema } from "../schema";
import { validatePermissions } from "../utils";

export default async function appreciationRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook(
    "onRequest",
    fastify.authenticate({ role: UserRole.COORDINATOR }),
  );

  fastify.patch<{
    Params: { id: string };
    Body: ApiAppreciationPatch;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiAppreciationPatch#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "ApiAppreciationGet#" },
            },
            required: ["message", "data"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not updated.`,
        );
      }

      // `status` is the source of truth, but a caller that only patches
      // `dateDue`/`dateDelivery` (the pre-be#909 contract) would otherwise
      // leave it stale — silently desyncing the two. Mirror the old
      // date-inference rule (`dateDelivery` set -> received, else pending)
      // whenever `status` itself isn't part of this patch; a caller that
      // does send `status` (e.g. to set the new "post" state) always wins.
      const patch = { ...request.body };
      if (
        patch.status === undefined &&
        (patch.dateDelivery !== undefined || patch.dateDue !== undefined)
      ) {
        const nextDateDelivery =
          patch.dateDelivery !== undefined
            ? patch.dateDelivery
            : appreciation.dateDelivery;
        patch.status = nextDateDelivery
          ? AppreciationStatusType.RECEIVED
          : AppreciationStatusType.PENDING;
      }

      const updatedAppreciation = await appreciationRepository.save({
        ...appreciation,
        ...patch,
      });

      return reply.status(200).send({
        message: `Appreciation with id:${id} updated.`,
        data: updatedAppreciation,
      });
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      const appreciationRepository = fastify.db.appreciationRepository;
      const appreciation = await appreciationRepository.findOne({
        where: { id },
      });

      if (!appreciation) {
        throw new NotFoundError(`Appreciation with id:${id} not found.`);
      }

      if (
        !validatePermissions(
          appreciation,
          [UserRole.ADMIN, UserRole.COORDINATOR],
          request.user,
        )
      ) {
        throw new UnauthorizedError(
          `Permission denied, appreciation with id:${id} not deleted.`,
        );
      }

      await appreciationRepository.remove(appreciation);

      return reply.status(200).send({
        message: `Appreciation with id:${id} deleted.`,
      });
    },
  );
}
