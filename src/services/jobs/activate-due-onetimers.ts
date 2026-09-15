import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import logger from "../../logger";
import { applyOnetimerTransition } from "../../server/utils/data/apply-onetimer-transition";
import { buildOnetimerOpportunityQuery } from "../../server/utils/data/build-onetimer-opportunity-query";
import { ONETIMER_TERMINAL_OPPORTUNITY_STATUSES } from "../../server/utils/data/onetimer-statuses";
import { berlinDayBoundaries, berlinToday } from "./german-holidays";

export async function activateDueOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const { endOfDay } = berlinDayBoundaries(berlinToday());

  // `<= endOfDay` (rather than restricting to today's window) lets a onetimer
  // whose exact appointment day the job missed — a deploy, an outage, a
  // failed transaction — still get activated on the next run, instead of
  // being silently skipped straight to PAST by scanExpiredOnetimers with no
  // error raised (be#987 review).
  const dueOpportunities = await buildOnetimerOpportunityQuery(fastify)
    .andWhere("opportunity.status NOT IN (:...terminalStatuses)", {
      terminalStatuses: [
        OpportunityStatusType.ACTIVE,
        ...ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
      ],
    })
    .andWhere("onetimer.date <= :endOfDay", {
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
    await applyOnetimerTransition(
      fastify,
      opportunity,
      OpportunityStatusType.ACTIVE,
      opportunity.opportunityVolunteer.map((volunteer) => ({
        volunteer,
        status: OpportunityVolunteerStatusType.ACTIVE,
      })),
      "activateDueOnetimers: failed to activate opportunity and its volunteer(s)",
    );
  }

  logger.info(
    `activateDueOnetimers: processed ${dueOpportunities.length} due opportunities`,
  );
}
