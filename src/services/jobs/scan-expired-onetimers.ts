import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import logger from "../../logger";
import { addWorkingDays, berlinToday } from "./german-holidays";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const dayBeforeToday = addWorkingDays(berlinToday(), -1);

  const expiredOpportunities = await fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .leftJoinAndSelect("opportunity.onetimer", "onetimer")
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
    .andWhere("onetimer.date < :yesterday", {
      yesterday: dayBeforeToday,
    })
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
