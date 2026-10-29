import { UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import Communication from "../../../data/entity/communication.entity";

export function assertCommunicationAuthor(
  communication: Communication,
  user: { id: number; role: UserRole },
  action: "update" | "delete",
): void {
  if (
    user.role !== UserRole.ADMIN &&
    communication.userId !== null &&
    communication.userId !== user.id
  ) {
    throw new UnauthorizedError(
      `You do not have permission to ${action} communication with id:${communication.id}.`,
    );
  }
}
