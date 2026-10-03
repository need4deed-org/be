import { FastifyInstance } from "fastify";
import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { And, LessThan, MoreThanOrEqual } from "typeorm";
import logger from "../../logger";
import { crossedMonthsAgo } from "./german-holidays";

export async function scanStalePending(
  fastify: FastifyInstance,
  now: Date = new Date(),
): Promise<void> {
  // Rows that reached 2 months without an update since yesterday's run.
  const { from, to } = crossedMonthsAgo(2, now);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.PENDING,
      updatedAt: And(MoreThanOrEqual(from), LessThan(to)),
      volunteer: { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
    },
    relations: ["volunteer.person", "volunteer.person.users"],
  });

  // Posted to Slack for coordinators (be#1088): nothing is recorded in
  // Communication, the daily window keeps each match to one post.
  for (const ov of ovs) {
    try {
      await fastify.cronNotify.emailStale(ov);
    } catch (err) {
      logger.error(`scanStalePending: ov ${ov.id} failed: ${err}`);
    }
  }
}
