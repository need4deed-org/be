import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { In, LessThan } from "typeorm";
import logger from "../../logger";
import { monthsAgo } from "./german-holidays";

export async function scanRegularUpdate(
  fastify: FastifyInstance,
): Promise<void> {
  const twoMonthsAgo = monthsAgo(2);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.REGULAR as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      updatedAt: LessThan(twoMonthsAgo),
    },
    relations: ["contactPerson", "contactPerson.users"],
  });

  // Posted to Slack for coordinators (be#1088): nothing is recorded in
  // Communication, the daily window keeps each opportunity to one post.
  for (const opp of opps) {
    try {
      await fastify.cronNotify.emailRegularUpdate(opp);
    } catch (err) {
      logger.error(`scanRegularUpdate: opp ${opp.id} failed: ${err}`);
    }
  }
}
