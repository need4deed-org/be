import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import logger from "../../logger";
import { buildOnetimerOpportunityQuery } from "../../server/utils/data/build-onetimer-opportunity-query";
import { addWorkingDays, berlinToday } from "./german-holidays";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const dayBeforeToday = addWorkingDays(berlinToday(), -1);

  const expiredOpportunities = await buildOnetimerOpportunityQuery(fastify)
    .andWhere("opportunity.status NOT IN (:...terminalStatuses)", {
      terminalStatuses: [
        OpportunityStatusType.INACTIVE,
        OpportunityStatusType.PAST,
      ],
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
      const hadMatchedVolunteer = opportunity.opportunityVolunteer.some(
        (opportunityVolunteer) =>
          opportunityVolunteer.status ===
          OpportunityVolunteerStatusType.MATCHED,
      );

      opportunity.status = hadMatchedVolunteer
        ? OpportunityStatusType.PAST
        : OpportunityStatusType.INACTIVE;
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
        "scanExpiredOnetimers: failed to mark opportunity as PAST/INACTIVE",
      );
    }
  }

  logger.info(
    `scanExpiredOnetimers: processed ${expiredOpportunities.length} expired opportunities`,
  );
}
