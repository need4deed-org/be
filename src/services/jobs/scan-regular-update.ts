import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import { crossedMonthsAgo } from "./german-holidays";
import { reportCronFailure } from "./report-cron-failure";

export async function scanRegularUpdate(
  fastify: FastifyInstance,
  now: Date = new Date(),
): Promise<void> {
  // Rows that reached 2 months without an update since yesterday's run.
  const { from, to } = crossedMonthsAgo(2, now);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.REGULAR as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      updatedAt: And(MoreThanOrEqual(from), LessThan(to)),
    },
    relations: ["contactPerson", "contactPerson.users"],
  });

  // Posted to Slack for coordinators (be#1088): nothing is recorded in
  // Communication, the daily window keeps each opportunity to one post.
  for (const opp of opps) {
    try {
      await fastify.cronNotify.emailRegularUpdate(opp);
    } catch (err) {
      await reportCronFailure(
        fastify,
        "scanRegularUpdate",
        `opportunity ${opp.id}`,
        err,
      );
    }
  }
}
