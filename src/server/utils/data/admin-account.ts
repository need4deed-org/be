import { isAdminManageableRole, UserRole } from "need4deed-sdk";
import { EntityManager, In, IsNull, Not } from "typeorm";
import { AdminActionError, NotFoundError } from "../../../config";
import ApiKey from "../../../data/entity/api-key.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import logger from "../../../logger";
import {
  buildEraseSummaryMessage,
  erasedEmailFor,
  erasePersonPii,
} from "./erase-person-pii";
import { revokeUserRefreshSessions } from "./refresh-session";

const isErased = (user: User) => user.email === erasedEmailFor(user.id);

// Lock before any other user row, so concurrent admin actions can't deadlock.
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

export const revokeApiKeys = (
  manager: EntityManager,
  userIds: number[],
  at: Date,
) =>
  manager.update(
    ApiKey,
    { userId: In(userIds), revokedAt: IsNull() },
    { revokedAt: at },
  );

export const leavingAdminIds = (users: User[]) =>
  users
    .filter((user) => user.role === UserRole.ADMIN && user.isActive)
    .map(({ id }) => id);

export async function findManageableUser(
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

  const logins = [user];
  if (personId) {
    if (await manager.exists(Volunteer, { where: { personId } })) {
      throw new AdminActionError(
        "not_manageable",
        "This person also has a volunteer profile. Delete the volunteer profile first, then this account.",
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
  const volunteerLoginIds = personId
    ? (
        await manager.find(User, {
          select: { id: true },
          where: { personId, role: UserRole.VOLUNTEER },
        })
      ).map(({ id }) => id)
    : [];
  const now = new Date();
  for (const loginId of loginIds) {
    await manager.update(
      User,
      { id: loginId },
      {
        isActive: false,
        deactivatedAt: now,
        credentialsValidAfter: now,
        email: erasedEmailFor(loginId),
      },
    );
  }
  for (const loginId of [...loginIds, ...volunteerLoginIds]) {
    await revokeUserRefreshSessions(manager, loginId);
  }
  await revokeApiKeys(manager, [...loginIds, ...volunteerLoginIds], now);
  const eraseSummary = personId
    ? await erasePersonPii(manager, personId)
    : undefined;

  logger.info(`Admin ${adminId} erased user(s) ${loginIds.join(", ")}`);
  return buildEraseSummaryMessage(
    `Account id:${loginIds.join(", id:")}`,
    eraseSummary,
  );
}
