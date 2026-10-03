import { FastifyInstance } from "fastify";
import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { LessThan } from "typeorm";
import logger from "../../logger";
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

  // Posted to Slack for coordinators (be#1088): nothing is recorded in
  // Communication, the daily window keeps each match to one post.
  for (const ov of ovs) {
    try {
      await fastify.cronNotify.emailPostMatchCheckup(ov);
    } catch (err) {
      logger.error(`scanPostMatchCheckup: ov ${ov.id} failed: ${err}`);
    }
  }
}
