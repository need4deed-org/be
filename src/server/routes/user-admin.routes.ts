import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ADMIN_ASSIGNABLE_ROLES,
  AdminUserActionErrorCode,
  ApiAdminUserActionResponse,
  ApiAdminUserRolePatch,
  isAdminManageableRole,
  UserRole,
} from "need4deed-sdk";
import { EntityManager, In, IsNull, Not } from "typeorm";
import { BadRequestError, BaseError, NotFoundError } from "../../config";
import ApiKey from "../../data/entity/api-key.entity";
import Person from "../../data/entity/person.entity";
import User from "../../data/entity/user.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
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

const isErased = (user: User) => user.email.endsWith(ERASED_EMAIL_DOMAIN);

/**
 * Locks every active admin row in id order. Every transaction that can take an
 * admin out of the active set calls this before locking any other user row, so
 * concurrent admin actions queue up instead of deadlocking.
 */
export async function lockActiveAdminIds(
  manager: EntityManager,
): Promise<number[]> {
  const activeAdmins = await manager.find(User, {
    select: { id: true },
    where: { role: UserRole.ADMIN, isActive: true },
    order: { id: "ASC" },
    lock: { mode: "for_no_key_update" },
  });
  return activeAdmins.map(({ id }) => id);
}

export function assertActiveAdminRemains(
  activeAdminIds: number[],
  leavingIds: number[],
): void {
  if (!activeAdminIds.some((id) => !leavingIds.includes(id))) {
    throw new AdminActionError(
      "last_admin",
      "The last active admin account must stay an active admin.",
    );
  }
}

const leavingAdminIds = (users: User[]) =>
  users
    .filter((user) => user.role === UserRole.ADMIN && user.isActive)
    .map(({ id }) => id);

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
  if (isErased(user)) {
    throw new AdminActionError("erased", "This account was deleted.");
  }
  if (user.personId) {
    user.person = await manager.findOneByOrFail(Person, { id: user.personId });
  }
  return user;
}

export async function eraseUserByAdmin(
  manager: EntityManager,
  id: number,
  adminId: number,
): Promise<string> {
  const activeAdminIds = await lockActiveAdminIds(manager);
  const user = await findManageableUser(manager, id, adminId);
  const { personId } = user;

  // Erasing anonymizes the whole Person, so every non-volunteer login of that
  // Person goes with it (erasePersonPii handles the volunteer logins).
  const logins = [user];
  if (personId) {
    if (await manager.exists(Volunteer, { where: { personId } })) {
      throw new AdminActionError(
        "not_manageable",
        "This person also has a volunteer profile. Delete it from the volunteer's page instead.",
      );
    }
    const otherLogins = await manager.find(User, {
      where: { personId, id: Not(id), role: Not(UserRole.VOLUNTEER) },
      order: { id: "ASC" },
      lock: { mode: "for_no_key_update" },
    });
    if (otherLogins.some((login) => login.id === adminId)) {
      throw new AdminActionError(
        "self",
        "This account belongs to the same person as your own account.",
      );
    }
    logins.push(...otherLogins.filter((login) => !isErased(login)));
  }
  assertActiveAdminRemains(activeAdminIds, leavingAdminIds(logins));

  const loginIds = logins.map((login) => login.id);
  const now = new Date();
  for (const loginId of loginIds) {
    await manager.update(
      User,
      { id: loginId },
      { isActive: false, deactivatedAt: now, email: erasedEmailFor(loginId) },
    );
    await revokeUserRefreshSessions(manager, loginId);
  }
  await manager.update(
    ApiKey,
    { userId: In(loginIds), revokedAt: IsNull() },
    { revokedAt: now },
  );
  const eraseSummary = personId
    ? await erasePersonPii(manager, personId)
    : undefined;
  if (eraseSummary && logins.some((login) => login.role === UserRole.AGENT)) {
    // An NGO login's own agent memberships aren't "other roles" of the person.
    eraseSummary.agentRoles = 0;
  }

  logger.info(`Admin ${adminId} erased user(s) ${loginIds.join(", ")}`);
  return buildEraseSummaryMessage(
    `Account id:${loginIds.join(", id:")}`,
    eraseSummary,
  );
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
