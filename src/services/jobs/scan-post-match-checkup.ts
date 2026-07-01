import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { In, LessThan } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
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

  const sentComms = await fastify.db.communicationRepository.find({
    where: {
      volunteerId: In(ovs.map((ov) => ov.volunteerId)),
      communicationType: CommunicationType.POST_FOLLOWUP,
    },
    select: ["volunteerId", "opportunityId"],
  });
  const alreadySentSet = new Set(
    sentComms.map((c) => `${c.volunteerId}-${c.opportunityId}`),
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
        await fastify.db.communicationRepository.remove(comm);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanPostMatchCheckup: ov ${ov.id} failed: ${err}`);
    }
  }
}
