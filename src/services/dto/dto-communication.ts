import { ApiCommunicationGet } from "need4deed-sdk";
import Communication from "../../data/entity/communication.entity";

export function dtoCommunication(
  communication: Communication,
): ApiCommunicationGet {
  return {
    id: communication.id,
    contactType: communication.contactType,
    contactMethod: communication.contactMethod,
    communicationType: communication.communicationType ?? undefined,
    date: communication.date,
    volunteerId: communication.volunteerId ?? undefined,
    opportunityId: communication.opportunityId ?? undefined,
    agentId: communication.agentId ?? undefined,
    userId: communication.userId,
  };
}
