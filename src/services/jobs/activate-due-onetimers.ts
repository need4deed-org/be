import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
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
      // Both writes happen in one transaction — if either fails, both roll
      // back, so an opportunity can never end up ACTIVE while its volunteer
      // is stuck at MATCHED (be#988).
      await fastify.db.opportunityRepository.manager.transaction(
        async (manager) => {
          opportunity.status = OpportunityStatusType.ACTIVE;
          await manager.save(Opportunity, opportunity);

          for (const opportunityVolunteer of opportunity.opportunityVolunteer) {
            opportunityVolunteer.status = OpportunityVolunteerStatusType.ACTIVE;
            await manager.save(OpportunityVolunteer, opportunityVolunteer);
          }
        },
      );
    } catch (err) {
      logger.error(
        { err, opportunityId: opportunity.id },
        "activateDueOnetimers: failed to activate opportunity and its volunteer(s)",
      );
    }
  }

  logger.info(
    `activateDueOnetimers: processed ${dueOpportunities.length} due opportunities`,
  );
}
