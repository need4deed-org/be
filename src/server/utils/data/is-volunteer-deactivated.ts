import { UserRole } from "need4deed-sdk";
import { EntityManager, IsNull, Not } from "typeorm";
import User from "../../../data/entity/user.entity";

export function isVolunteerDeactivated(
  manager: EntityManager,
  volunteerId: number,
): Promise<boolean> {
  return manager.exists(User, {
    where: {
      role: UserRole.VOLUNTEER,
      deactivatedAt: Not(IsNull()),
      person: { volunteer: { id: volunteerId } },
    },
  });
}
