import { UserRole } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import User from "../../../data/entity/user.entity";

export async function isVolunteerDeactivated(
  manager: EntityManager,
  volunteerId: number,
): Promise<boolean> {
  const logins = await manager.find(User, {
    select: { id: true, deactivatedAt: true },
    where: {
      role: UserRole.VOLUNTEER,
      person: { volunteer: { id: volunteerId } },
    },
  });
  return (
    logins.length > 0 && logins.every(({ deactivatedAt }) => deactivatedAt)
  );
}
