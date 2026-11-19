import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ADMIN_ASSIGNABLE_ROLES,
  AdminUserActionErrorCode,
  ApiAdminUserActionResponse,
  ApiAdminUserRolePatch,
  isAdminManageableRole,
  UserRole,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BadRequestError, BaseError, NotFoundError } from "../../config";
import Person from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import logger from "../../logger";
import { serializeUserToMeDTO } from "../../services/dto/dto-user";
import { idParamSchema, responseSchema } from "../schema";
import { ParamsId, ReplyData, ReplyMessage } from "../types";
import {
  buildEraseSummaryMessage,
  ERASED_EMAIL_DOMAIN,
  erasedEmailFor,
  erasePersonPii,
} from "../utils/data/erase-person-pii";
import { revokeUserRefreshSessions } from "../utils/data/refresh-session";

class AdminActionError extends BaseError {
  constructor(code: AdminUserActionErrorCode, message: string) {
    super(message, 400, true, { code });
  }
}

async function findManageableUser(
  manager: EntityManager,
  id: number,
  adminId: number,
): Promise<User> {
  const user = await manager.findOne(User, {
    where: { id },
    lock: { mode: "for_no_key_update" },
  });
  if (!user) {
    throw new NotFoundError(`User id:${id} not found.`);
  }
  if (!isAdminManageableRole(user.role)) {
    throw new AdminActionError(
      "not_manageable",
      "Admins manage coordinator, NGO and admin accounts only.",
    );
  }
  if (user.id === adminId) {
    throw new AdminActionError(
      "self",
      "You can't do this to your own account.",
    );
  }
  if (user.personId) {
    user.person = await manager.findOneByOrFail(Person, { id: user.personId });
  }
  return user;
}

async function assertNotLastActiveAdmin(
  manager: EntityManager,
  user: User,
): Promise<void> {
  if (user.role !== UserRole.ADMIN || !user.isActive) {
    return;
  }
  // The caller is an admin too, but two admins acting on each other at once could both pass.
  const activeAdmins = await manager.find(User, {
    select: { id: true },
    where: { role: UserRole.ADMIN, isActive: true },
    order: { id: "ASC" },
    lock: { mode: "for_no_key_update" },
  });
  if (!activeAdmins.some((admin) => admin.id !== user.id)) {
    throw new AdminActionError(
      "last_admin",
      "The last active admin account must stay an active admin.",
    );
  }
}

export async function eraseUserByAdmin(
  manager: EntityManager,
  id: number,
  adminId: number,
): Promise<string> {
  const user = await findManageableUser(manager, id, adminId);
  await assertNotLastActiveAdmin(manager, user);

  await manager.update(
    User,
    { id },
    {
      isActive: false,
      deactivatedAt: new Date(),
      email: erasedEmailFor(id),
    },
  );
  await revokeUserRefreshSessions(manager, id);
  const eraseSummary = user.personId
    ? await erasePersonPii(manager, user.personId)
    : undefined;

  logger.info(`Admin ${adminId} erased user ${id}`);
  return buildEraseSummaryMessage(`Account id:${id}`, eraseSummary);
}

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
        const user = await findManageableUser(manager, id, adminId);
        await assertNotLastActiveAdmin(manager, user);
        user.isActive = false;
        user.deactivatedAt = new Date();
        await manager.update(
          User,
          { id },
          { isActive: false, deactivatedAt: user.deactivatedAt },
        );
        await revokeUserRefreshSessions(manager, id);
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
        if (user.email.endsWith(ERASED_EMAIL_DOMAIN)) {
          throw new AdminActionError(
            "erased",
            "This account was deleted and can't be reactivated.",
          );
        }
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
      if (!user.isActive) {
        throw new BadRequestError("Reactivate the account first.");
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
        await assertNotLastActiveAdmin(manager, user);
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
