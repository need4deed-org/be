import { UserRole } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import User from "../../../data/entity/user.entity";

export async function isVolunteerDeactivated(
  manager: EntityManager,
  volunteerId: number,
): Promise<boolean> {
  const logins = await manager.find(User, {
    select: { id: true, isActive: true, deactivatedAt: true },
    where: {
      role: UserRole.VOLUNTEER,
      person: { volunteer: { id: volunteerId } },
    },
  });
  return (
    logins.some(({ deactivatedAt }) => deactivatedAt) &&
    !logins.some(({ isActive, deactivatedAt }) => isActive && !deactivatedAt)
  );
}
