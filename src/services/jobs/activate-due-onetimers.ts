import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import logger from "../../logger";
import { berlinDayBoundaries, berlinToday } from "./german-holidays";

export async function activateDueOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const { startOfDay, endOfDay } = berlinDayBoundaries(berlinToday());

  const dueOpportunities = await fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .leftJoinAndSelect("opportunity.onetimer", "onetimer")
    .leftJoinAndSelect(
      "opportunity.opportunityVolunteer",
      "opportunityVolunteer",
    )
    .where("opportunity.type IN (:...types)", {
      types: [OpportunityType.ACCOMPANYING, OpportunityType.EVENTS],
    })
    .andWhere("opportunity.status != :active", {
      active: OpportunityStatusType.ACTIVE,
    })
    .andWhere("onetimer.date BETWEEN :startOfDay AND :endOfDay", {
      startOfDay,
      endOfDay,
    })
    .andWhere("opportunityVolunteer.status = :matched", {
      matched: OpportunityVolunteerStatusType.MATCHED,
    })
    .getMany();

  if (!dueOpportunities.length) {
    return;
  }

  for (const opportunity of dueOpportunities) {
    try {
      opportunity.status = OpportunityStatusType.ACTIVE;
      await fastify.db.opportunityRepository.save(opportunity);

      for (const opportunityVolunteer of opportunity.opportunityVolunteer) {
        if (
          opportunityVolunteer.status === OpportunityVolunteerStatusType.MATCHED
        ) {
          try {
            opportunityVolunteer.status = OpportunityVolunteerStatusType.ACTIVE;
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
              "activateDueOnetimers: failed to mark opportunity volunteer as ACTIVE",
            );
          }
        }
      }
    } catch (err) {
      logger.error(
        { err, opportunityId: opportunity.id },
        "activateDueOnetimers: failed to mark opportunity as ACTIVE",
      );
    }
  }

  logger.info(
    `activateDueOnetimers: activated ${dueOpportunities.length} opportunities`,
  );
}
