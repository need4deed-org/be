import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import { AGENT_CONTACT_RELATIONS } from "../../data/utils";
import { crossedMonthsAgo } from "./berlin-dates";
import { reportCronFailure } from "./report-cron-failure";

export async function scanRegularUpdate(
  fastify: FastifyInstance,
  now: Date = new Date(),
): Promise<void> {
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
    relations: ["contactPerson", ...AGENT_CONTACT_RELATIONS],
  });

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
