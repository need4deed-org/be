import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { In, LessThan } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
import { monthsAgo } from "./german-holidays";

export async function scanRegularUpdate(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = monthsAgo(2);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.REGULAR as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      updatedAt: LessThan(twoMonthsAgo),
    },
    relations: ["contactPerson", "contactPerson.users"],
  });

  if (!opps.length) {
    return;
  }

  const sentComms = await fastify.db.communicationRepository.find({
    where: {
      opportunityId: In(opps.map((o) => o.id)),
      communicationType: CommunicationType.OPPORTUNITY_UPDATED,
    },
    select: ["opportunityId", "date"],
  });
  const lastSentMap = new Map<number, Date>();
  for (const c of sentComms) {
    const prev = lastSentMap.get(c.opportunityId!);
    if (!prev || c.date > prev) {
      lastSentMap.set(c.opportunityId!, c.date);
    }
  }

  for (const opp of opps) {
    try {
      const lastSent = lastSentMap.get(opp.id);
      if (lastSent && lastSent > opp.updatedAt) {
        continue;
      }

      const comm = await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.OPPORTUNITY_UPDATED,
        { opportunityId: opp.id },
      );
      try {
        await fastify.notify.emailRegularUpdate(opp);
      } catch (sendErr) {
        await fastify.db.communicationRepository.remove(comm);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanRegularUpdate: opp ${opp.id} failed: ${err}`);
    }
  }
}
