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

export async function scanStalePending(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = monthsAgo(2);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.PENDING,
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
    CommunicationType.STATUS_UPDATE,
  );

  for (const ov of ovs) {
    try {
      if (alreadySentSet.has(`${ov.volunteerId}-${ov.opportunityId}`)) {
        continue;
      }

      const comm = await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.STATUS_UPDATE,
        { volunteerId: ov.volunteerId, opportunityId: ov.opportunityId },
      );
      try {
        await fastify.notify.emailStale(ov);
      } catch (sendErr) {
        await fastify.db.communicationRepository
          .remove(comm)
          .catch(logger.error);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanStalePending: ov ${ov.id} failed: ${err}`);
    }
  }
}
