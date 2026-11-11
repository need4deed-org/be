import { UserRole } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import User from "../../../data/entity/user.entity";

export async function isVolunteerDeactivated(
  manager: EntityManager,
  volunteerId: number,
): Promise<boolean> {
  const logins = await manager.find(User, {
    select: { id: true, createdAt: true, deactivatedAt: true },
    where: {
      role: UserRole.VOLUNTEER,
      person: { volunteer: { id: volunteerId } },
    },
  });
  const latest = (dates: Date[]) =>
    Math.max(...dates.map((date) => date.getTime()));
  const deactivations = logins.flatMap(({ deactivatedAt }) =>
    deactivatedAt ? [deactivatedAt] : [],
  );
  const activeIssues = logins
    .filter(({ deactivatedAt }) => !deactivatedAt)
    .map(({ createdAt }) => createdAt);
  return (
    deactivations.length > 0 &&
    (activeIssues.length === 0 || latest(deactivations) > latest(activeIssues))
  );
}
