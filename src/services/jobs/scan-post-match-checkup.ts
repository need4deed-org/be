import { FastifyInstance } from "fastify";
import {
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { And, LessThan, MoreThanOrEqual } from "typeorm";
import { crossedMonthsAgo } from "./german-holidays";
import { reportCronFailure } from "./report-cron-failure";

export async function scanPostMatchCheckup(
  fastify: FastifyInstance,
  now: Date = new Date(),
): Promise<void> {
  const { from, to } = crossedMonthsAgo(2, now);

  const ovs = await fastify.db.opportunityVolunteerRepository.find({
    where: {
      status: OpportunityVolunteerStatusType.MATCHED,
      updatedAt: And(MoreThanOrEqual(from), LessThan(to)),
      volunteer: { statusEngagement: VolunteerStateEngagementType.AVAILABLE },
    },
    relations: ["volunteer.person", "volunteer.person.users"],
  });

  for (const ov of ovs) {
    try {
      await fastify.cronNotify.emailPostMatchCheckup(ov);
    } catch (err) {
      await reportCronFailure(
        fastify,
        "scanPostMatchCheckup",
        `match ${ov.id}`,
        err,
      );
    }
  }
}
