import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  ProfileVolunteeringType,
} from "need4deed-sdk";
import { In, LessThan } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";

export async function scanRegularUpdate(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: ProfileVolunteeringType.REGULAR as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      createdAt: LessThan(twoMonthsAgo),
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
      if (alreadySent) {continue;}

      await fastify.notify.emailRegularUpdate(opp);
      await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.OPPORTUNITY_UPDATED,
        { opportunityId: opp.id },
      );
    } catch (err) {
      logger.error(`scanRegularUpdate: opp ${opp.id} failed: ${err}`);
    }
  }
}
