import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { Brackets } from "typeorm";
import logger from "../../logger";
import { daysAgo } from "../utils";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const yesterday = daysAgo(1);

  const expiredOpportunities = await fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .leftJoinAndSelect("opportunity.accompanying", "accompanying")
    .leftJoinAndSelect("opportunity.deal", "deal")
    .leftJoinAndSelect("deal.dealTimeslot", "dealTimeslot")
    .leftJoinAndSelect("dealTimeslot.timeslot", "timeslot")
    .where("opportunity.type IN (:...types)", {
      types: [OpportunityType.ACCOMPANYING, OpportunityType.EVENTS],
    })
    .andWhere("opportunity.status != :inactive", {
      inactive: OpportunityStatusType.INACTIVE,
    })
    .andWhere(
      new Brackets((qb) => {
        qb.where("accompanying.date < :yesterday", { yesterday }).orWhere(
          "timeslot.start < :yesterday",
          { yesterday },
        );
      }),
    )
    .getMany();

  if (!expiredOpportunities.length) {
    return;
  }

  for (const opportunity of expiredOpportunities) {
    opportunity.status = OpportunityStatusType.INACTIVE;
    await fastify.db.opportunityRepository.save(opportunity);
  }

  logger.info(
    `scanExpiredOnetimers: marked ${expiredOpportunities.length} opportunities as INACTIVE`,
  );
}
