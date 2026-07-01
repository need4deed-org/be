import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import { In, Repository } from "typeorm";
import Communication from "../../../data/entity/communication.entity";

export async function logEmailCommunication(
  repo: Repository<Communication>,
  communicationType: CommunicationType,
  ids: { volunteerId?: number; opportunityId?: number; agentId?: number },
): Promise<Communication> {
  return repo.save(
    new Communication({
      contactType: ContactType.TEXT_EMAIL,
      contactMethod: ContactMethodType.EMAIL,
      communicationType,
      ...ids,
    }),
  );
}

export async function buildSentPairSet(
  repo: Repository<Communication>,
  volunteerIds: number[],
  opportunityIds: number[],
  communicationType: CommunicationType,
): Promise<Set<string>> {
  const sentComms = await repo.find({
    where: {
      volunteerId: In(volunteerIds),
      opportunityId: In(opportunityIds),
      communicationType,
    },
    select: ["volunteerId", "opportunityId"],
  });
  return new Set(sentComms.map((c) => `${c.volunteerId}-${c.opportunityId}`));
}

export async function buildLastSentMap(
  repo: Repository<Communication>,
  opportunityIds: number[],
  communicationType: CommunicationType,
): Promise<Map<number, Date>> {
  const sentComms = await repo.find({
    where: { opportunityId: In(opportunityIds), communicationType },
    select: ["opportunityId", "date"],
  });
  const map = new Map<number, Date>();
  for (const c of sentComms) {
    const prev = map.get(c.opportunityId!);
    if (!prev || c.date > prev) {
      map.set(c.opportunityId!, c.date);
    }
  }
  return map;
}
