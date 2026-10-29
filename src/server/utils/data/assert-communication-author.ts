import { canModifyCommunication, UserRole } from "need4deed-sdk";
import { UnauthorizedError } from "../../../config/error/fastify";
import Communication from "../../../data/entity/communication.entity";

export function assertCommunicationAuthor(
  communication: Communication,
  user: { id: number; role: UserRole },
  action: "update" | "delete",
): void {
  if (!canModifyCommunication(communication, user)) {
    throw new UnauthorizedError(
      `You do not have permission to ${action} communication with id:${communication.id}.`,
    );
  }
}
