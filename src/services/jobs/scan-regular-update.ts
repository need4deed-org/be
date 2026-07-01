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

  for (const opp of opps) {
    try {
      const alreadySent = await fastify.db.communicationRepository.findOne({
        where: {
          opportunityId: opp.id,
          communicationType: CommunicationType.OPPORTUNITY_UPDATED,
        },
      });
      if (alreadySent) {
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
