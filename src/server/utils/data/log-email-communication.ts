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
  if (!opportunityIds.length) {
    return new Map();
  }
  const rows = await repo
    .createQueryBuilder("c")
    .select("c.opportunityId", "opportunityId")
    .addSelect("MAX(c.date)", "date")
    .where("c.opportunityId IN (:...ids)", { ids: opportunityIds })
    .andWhere("c.communicationType = :type", { type: communicationType })
    .groupBy("c.opportunityId")
    .getRawMany<{ opportunityId: number; date: string | Date }>();
  return new Map(rows.map((r) => [Number(r.opportunityId), new Date(r.date)]));
}
