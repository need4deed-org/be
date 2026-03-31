import { ApiCommunicationGet } from "need4deed-sdk";
import Communication from "../../data/entity/communication.entity";

export function dtoCommunication(
  communication: Communication,
): ApiCommunicationGet {
  return {
    id: communication.id,
    contactType: communication.contactType,
    contactMethod: communication.contactMethod,
    communicationType: communication.communicationType,
    date: communication.date,
    agentId: communication.agentId,
    userId: communication.userId,
  };
}
