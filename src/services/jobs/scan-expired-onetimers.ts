import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import logger from "../../logger";
import { applyOnetimerTransition } from "../../server/utils/data/apply-onetimer-transition";
import { buildOnetimerOpportunityQuery } from "../../server/utils/data/build-onetimer-opportunity-query";
import {
  ONETIMER_ENGAGED_VOLUNTEER_STATUSES,
  ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
} from "../../server/utils/data/onetimer-statuses";
import { addWorkingDays, berlinToday } from "./german-holidays";

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const dayBeforeToday = addWorkingDays(berlinToday(), -1);

  const expiredOpportunities = await buildOnetimerOpportunityQuery(fastify)
    .andWhere("opportunity.status NOT IN (:...terminalStatuses)", {
      terminalStatuses: ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
    })
    .andWhere("onetimer.date < :yesterday", {
      yesterday: dayBeforeToday,
    })
    .getMany();

  if (!expiredOpportunities.length) {
    return;
  }

  for (const opportunity of expiredOpportunities) {
    const engagedVolunteers = opportunity.opportunityVolunteer.filter(
      (opportunityVolunteer) =>
        ONETIMER_ENGAGED_VOLUNTEER_STATUSES.includes(
          opportunityVolunteer.status,
        ),
    );

    await applyOnetimerTransition(
      fastify,
      opportunity,
      engagedVolunteers.length
        ? OpportunityStatusType.PAST
        : OpportunityStatusType.INACTIVE,
      engagedVolunteers.map((volunteer) => ({
        volunteer,
        status: OpportunityVolunteerStatusType.PAST,
      })),
      "scanExpiredOnetimers: failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
    );
  }

  logger.info(
    `scanExpiredOnetimers: processed ${expiredOpportunities.length} expired opportunities`,
  );
}
