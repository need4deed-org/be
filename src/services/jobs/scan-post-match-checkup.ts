import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { LessThan, MoreThan } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";

export async function scanPostMatchCheckup(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.MATCHED,
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
          opportunityId: ov.opportunityId,
          communicationType: CommunicationType.POST_FOLLOWUP,
          date: MoreThan(ov.updatedAt),
        },
      });
      if (alreadySent) {
        continue;
      }

      await fastify.notify.emailPostMatchCheckup(ov);
      await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.POST_FOLLOWUP,
        { volunteerId: ov.volunteerId, opportunityId: ov.opportunityId },
      );
    } catch (err) {
      logger.error(`scanPostMatchCheckup: ov ${ov.id} failed: ${err}`);
    }
  }
}
