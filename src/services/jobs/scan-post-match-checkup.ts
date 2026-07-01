import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { LessThan } from "typeorm";
import logger from "../../logger";
import {
  buildSentPairSet,
  logEmailCommunication,
} from "../../server/utils/data/log-email-communication";
import { monthsAgo } from "./german-holidays";

export async function scanPostMatchCheckup(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = monthsAgo(2);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.MATCHED,
      updatedAt: LessThan(twoMonthsAgo),
      volunteer: { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
    },
    relations: ["volunteer.person", "volunteer.person.users"],
  });

  if (!ovs.length) {
    return;
  }

  const alreadySentSet = await buildSentPairSet(
    fastify.db.communicationRepository,
    ovs.map((ov) => ov.volunteerId),
    ovs.map((ov) => ov.opportunityId),
    CommunicationType.POST_FOLLOWUP,
  );

  for (const ov of ovs) {
    try {
      if (alreadySentSet.has(`${ov.volunteerId}-${ov.opportunityId}`)) {
        continue;
      }

      const comm = await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.POST_FOLLOWUP,
        { volunteerId: ov.volunteerId, opportunityId: ov.opportunityId },
      );
      try {
        await fastify.notify.emailPostMatchCheckup(ov);
      } catch (sendErr) {
        await fastify.db.communicationRepository
          .remove(comm)
          .catch(logger.error);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanPostMatchCheckup: ov ${ov.id} failed: ${err}`);
    }
  }
}
