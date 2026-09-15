import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import { buildOnetimerOpportunityQuery } from "../../server/utils/data/build-onetimer-opportunity-query";
import { addWorkingDays, berlinToday } from "./german-holidays";

// activateDueOnetimers already promotes a matched volunteer to ACTIVE on the
// appointment day, so by the time this job revisits the opportunity its
// volunteer may still be MATCHED (never got activated) or already ACTIVE —
// both count as "was engaged" for deciding PAST vs INACTIVE (be#987 review).
const ENGAGED_VOLUNTEER_STATUSES: OpportunityVolunteerStatusType[] = [
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
];

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
      const engagedVolunteers = opportunity.opportunityVolunteer.filter(
        (opportunityVolunteer) =>
          ENGAGED_VOLUNTEER_STATUSES.includes(opportunityVolunteer.status),
      );

      opportunity.status = engagedVolunteers.length
        ? OpportunityStatusType.PAST
        : OpportunityStatusType.INACTIVE;

      // Both writes happen in one transaction — if either fails, both roll
      // back, so an opportunity can never end up PAST/INACTIVE while its
      // volunteer is left stuck at MATCHED/ACTIVE (be#987 review, mirroring
      // the be#988 fix in activateDueOnetimers).
      await fastify.db.opportunityRepository.manager.transaction(
        async (manager) => {
          await manager.save(Opportunity, opportunity);

          for (const opportunityVolunteer of engagedVolunteers) {
            opportunityVolunteer.status = OpportunityVolunteerStatusType.PAST;
            await manager.save(OpportunityVolunteer, opportunityVolunteer);
          }
        },
      );
    } catch (err) {
      logger.error(
        { err, opportunityId: opportunity.id },
        "scanExpiredOnetimers: failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      );
    }
  }

  logger.info(
    `scanExpiredOnetimers: processed ${expiredOpportunities.length} expired opportunities`,
  );
}
