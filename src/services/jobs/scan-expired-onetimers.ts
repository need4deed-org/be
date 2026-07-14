import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { Brackets } from "typeorm";
import logger from "../../logger";
import { addWorkingDays, berlinToday } from "./german-holidays";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const dayBeforeToday = addWorkingDays(berlinToday(), -1);

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
    try {
      opportunity.status = OpportunityStatusType.INACTIVE;
      await fastify.db.opportunityRepository.save(opportunity);

      for (const opportunityVolunteer of opportunity.opportunityVolunteer) {
        if (
          opportunityVolunteer.status === OpportunityVolunteerStatusType.MATCHED
        ) {
          try {
            opportunityVolunteer.status = OpportunityVolunteerStatusType.PAST;
            await fastify.db.opportunityVolunteerRepository.save(
              opportunityVolunteer,
            );
          } catch (err) {
            logger.error(
              {
                err,
                opportunityId: opportunity.id,
                opportunityVolunteerId: opportunityVolunteer.id,
              },
              "scanExpiredOnetimers: failed to mark opportunity volunteer as PAST",
            );
          }
        }
      }
    } catch (err) {
      logger.error(
        { err, opportunityId: opportunity.id },
        "scanExpiredOnetimers: failed to mark opportunity as INACTIVE",
      );
    }
  }

  logger.info(
    `scanExpiredOnetimers: marked ${expiredOpportunities.length} opportunities as INACTIVE`,
  );
}
