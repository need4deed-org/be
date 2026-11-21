import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ADMIN_ASSIGNABLE_ROLES,
  ApiAdminUserActionResponse,
  ApiAdminUserRolePatch,
  UserRole,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { AdminActionError, BadRequestError } from "../../config";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
import { serializeUserToMeDTO } from "../../services/dto/dto-user";
import { idParamSchema, responseSchema } from "../schema";
import { ParamsId, ReplyData, ReplyMessage } from "../types";
import {
  assertActiveAdminRemains,
  findManageableUser,
  leavingAdminIds,
  lockActiveAdminIds,
  revokeApiKeys,
} from "../utils/data/admin-account";
import { revokeUserRefreshSessions } from "../utils/data/refresh-session";

export default async function userAdminRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const transaction = <T>(work: (manager: EntityManager) => Promise<T>) =>
    fastify.db.userRepository.manager.transaction(work);

  fastify.post<{
    Params: ParamsId;
    Reply: ReplyData<ApiAdminUserActionResponse>;
  }>(
    "/:id/deactivate",
    {
      schema: { params: idParamSchema, response: responseSchema("ApiUserMe#") },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
    },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.authUser!.id;

      const user = await transaction(async (manager) => {
        const activeAdminIds = await lockActiveAdminIds(manager);
        const user = await findManageableUser(manager, id, adminId);
        if (user.deactivatedAt) {
          return user;
        }
        if (!user.isActive) {
          throw new BadRequestError("This account hasn't been verified yet.");
        }
        assertActiveAdminRemains(activeAdminIds, leavingAdminIds([user]));
        user.isActive = false;
        user.deactivatedAt = new Date();
        await manager.update(
          User,
          { id },
          { isActive: false, deactivatedAt: user.deactivatedAt },
        );
        await revokeUserRefreshSessions(manager, id);
        await revokeApiKeys(manager, [id], user.deactivatedAt);
        return user;
      });

      logger.info(`Admin ${adminId} deactivated user ${id}`);
      return reply.status(200).send({
        message: `Account id:${id} deactivated.`,
        data: serializeUserToMeDTO(user),
      });
    },
  );

  fastify.post<{
    Params: ParamsId;
    Reply: ReplyData<ApiAdminUserActionResponse>;
  }>(
    "/:id/reactivate",
    {
      schema: { params: idParamSchema, response: responseSchema("ApiUserMe#") },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
    },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.authUser!.id;

      const user = await transaction(async (manager) => {
        const user = await findManageableUser(manager, id, adminId);
        if (!user.deactivatedAt) {
          throw new AdminActionError(
            "not_deactivated",
            "This account isn't deactivated.",
          );
        }
        user.isActive = true;
        user.deactivatedAt = null;
        await manager.update(
          User,
          { id },
          { isActive: true, deactivatedAt: null },
        );
        return user;
      });

      logger.info(`Admin ${adminId} reactivated user ${id}`);
      return reply.status(200).send({
        message: `Account id:${id} reactivated.`,
        data: serializeUserToMeDTO(user),
      });
    },
  );

  fastify.post<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id/password-reset",
    {
      schema: { params: idParamSchema, response: responseSchema("") },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
    },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.authUser!.id;

      const user = await transaction((manager) =>
        findManageableUser(manager, id, adminId),
      );
      if (user.deactivatedAt) {
        throw new BadRequestError("Reactivate the account first.");
      }
      if (!user.isActive) {
        throw new BadRequestError("This account hasn't been verified yet.");
      }
      await fastify.notify.passwordReset(user);

      logger.info(`Admin ${adminId} sent a password reset to user ${id}`);
      return reply
        .status(200)
        .send({ message: `Password reset email sent for account id:${id}.` });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiAdminUserRolePatch;
    Reply: ReplyData<ApiAdminUserActionResponse>;
  }>(
    "/:id/role",
    {
      schema: {
        params: idParamSchema,
        body: {
          type: "object",
          required: ["role"],
          additionalProperties: false,
          properties: {
            role: { type: "string", enum: [...ADMIN_ASSIGNABLE_ROLES] },
          },
        },
        response: responseSchema("ApiUserMe#"),
      },
      onRequest: [fastify.authenticate({ role: UserRole.ADMIN })],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { role } = request.body;
      const adminId = request.authUser!.id;

      const user = await transaction(async (manager) => {
        const activeAdminIds = await lockActiveAdminIds(manager);
        const user = await findManageableUser(manager, id, adminId);
        if (user.role === UserRole.AGENT) {
          throw new AdminActionError(
            "role_not_assignable",
            "NGO accounts can't switch to a staff role.",
          );
        }
        if (user.role === role) {
          return user;
        }
        assertActiveAdminRemains(activeAdminIds, leavingAdminIds([user]));
        user.role = role;
        await manager.update(User, { id }, { role });
        await revokeUserRefreshSessions(manager, id);
        return user;
      });

      logger.info(`Admin ${adminId} set the role of user ${id} to ${role}`);
      return reply.status(200).send({
        message: `Account id:${id} is now ${role}.`,
        data: serializeUserToMeDTO(user),
      });
    },
  );
}
