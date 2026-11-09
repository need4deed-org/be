import { FastifyInstance } from "fastify";
import {
  addWorkingDays,
  berlinToday,
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import {
  applyOnetimerTransition,
  logOnetimerOutcomes,
  OnetimerPlan,
  OnetimerSnapshot,
} from "../../server/utils/data/apply-onetimer-transition";
import { buildOnetimerOpportunityQuery } from "../../server/utils/data/build-onetimer-opportunity-query";
import {
  ONETIMER_ENGAGED_VOLUNTEER_STATUSES,
  ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
} from "../../server/utils/data/onetimer-statuses";
import { berlinDayBoundaries } from "./berlin-dates";

export const expiryPlan =
  (cutoff: Date) =>
  ({ status, date, matches }: OnetimerSnapshot): OnetimerPlan | null => {
    if (
      !date ||
      date >= cutoff ||
      ONETIMER_TERMINAL_OPPORTUNITY_STATUSES.includes(status)
    ) {
      return null;
    }
    const engaged = matches.filter((match) =>
      ONETIMER_ENGAGED_VOLUNTEER_STATUSES.includes(match.status),
    );
    return {
      opportunityStatus: engaged.length
        ? OpportunityStatusType.PAST
        : OpportunityStatusType.INACTIVE,
      matches: engaged.map((match) => ({
        ...match,
        status: OpportunityVolunteerStatusType.PAST,
      })),
    };
  };

export async function scanExpiredOnetimers(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
  const { startOfDay: cutoff } = berlinDayBoundaries(addWorkingDays(today, -1));

  const candidates = await buildOnetimerOpportunityQuery(fastify)
    .andWhere("opportunity.status NOT IN (:...terminalStatuses)", {
      terminalStatuses: ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
    })
    .andWhere("onetimer.date < :cutoff", { cutoff })
    .getMany();

  if (!candidates.length) {
    return;
  }

  const outcomes = [];
  for (const { id } of candidates) {
    outcomes.push(
      await applyOnetimerTransition(
        fastify,
        id,
        expiryPlan(cutoff),
        "scanExpiredOnetimers: failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );
  }
  logOnetimerOutcomes("scanExpiredOnetimers", outcomes);
}
