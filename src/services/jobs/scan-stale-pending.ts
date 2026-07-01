import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { LessThan, MoreThan } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";

export async function scanStalePending(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.PENDING,
      updatedAt: LessThan(twoMonthsAgo),
      volunteer: { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
    },
    relations: ["volunteer.person", "volunteer.person.users"],
  });

  for (const ov of ovs) {
    try {
      const alreadySent = await fastify.db.communicationRepository.findOne({
        where: {
          volunteerId: ov.volunteerId,
          communicationType: CommunicationType.STATUS_UPDATE,
          date: MoreThan(ov.updatedAt),
        },
      });
      if (alreadySent) {continue;}

      await fastify.notify.emailStale(ov);
      await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.STATUS_UPDATE,
        { volunteerId: ov.volunteerId },
      );
    } catch (err) {
      logger.error(`scanStalePending: ov ${ov.id} failed: ${err}`);
    }
  }
}
