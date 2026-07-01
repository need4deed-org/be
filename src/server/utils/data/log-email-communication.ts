import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import { Repository } from "typeorm";
import Communication from "../../../data/entity/communication.entity";

export async function logEmailCommunication(
  repo: Repository<Communication>,
  communicationType: CommunicationType,
  ids: { volunteerId?: number; opportunityId?: number; agentId?: number },
): Promise<void> {
  await repo.save(
    new Communication({
      contactType: ContactType.TEXT_EMAIL,
      contactMethod: ContactMethodType.EMAIL,
      communicationType,
      ...ids,
    }),
  );
}
