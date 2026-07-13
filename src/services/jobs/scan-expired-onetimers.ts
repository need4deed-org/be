import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { Brackets } from "typeorm";
import logger from "../../logger";
import { berlinToday } from "./german-holidays";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const dayBeforeToday = berlinToday().setDate(berlinToday().getDate() - 1);

  const expiredOpportunities = await fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .leftJoinAndSelect("opportunity.accompanying", "accompanying")
    .leftJoinAndSelect("opportunity.deal", "deal")
    .leftJoinAndSelect("deal.dealTimeslot", "dealTimeslot")
    .leftJoinAndSelect("dealTimeslot.timeslot", "timeslot")
    .leftJoinAndSelect(
      "opportunity.opportunityVolunteer",
      "opportunityVolunteer",
    )
    .where("opportunity.type IN (:...types)", {
      types: [OpportunityType.ACCOMPANYING, OpportunityType.EVENTS],
    })
    .andWhere("opportunity.status != :inactive", {
      inactive: OpportunityStatusType.INACTIVE,
    })
    .andWhere(
      new Brackets((qb) => {
        qb.where("accompanying.date < :yesterday", {
          yesterday: dayBeforeToday,
        }).orWhere("timeslot.start < :yesterday", {
          yesterday: dayBeforeToday,
        });
      }),
    )
    .getMany();

  if (!expiredOpportunities.length) {
    return;
  }

  for (const opportunity of expiredOpportunities) {
    opportunity.status = OpportunityStatusType.INACTIVE;
    await fastify.db.opportunityRepository.save(opportunity);

    for (const opportunityVolunteer of opportunity.opportunityVolunteer) {
      if (
        opportunityVolunteer.status === OpportunityVolunteerStatusType.MATCHED
      ) {
        opportunityVolunteer.status = OpportunityVolunteerStatusType.PAST;
        await fastify.db.opportunityVolunteerRepository.save(
          opportunityVolunteer,
        );
      }
    }
  }

  logger.info(
    `scanExpiredOnetimers: marked ${expiredOpportunities.length} opportunities as INACTIVE`,
  );
}
