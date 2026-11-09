import { FastifyInstance } from "fastify";
import {
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
import { ONETIMER_TERMINAL_OPPORTUNITY_STATUSES } from "../../server/utils/data/onetimer-statuses";
import { berlinDayBoundaries } from "./berlin-dates";

const NOT_ACTIVATABLE = [
  OpportunityStatusType.ACTIVE,
  ...ONETIMER_TERMINAL_OPPORTUNITY_STATUSES,
];

export const activationPlan =
  (endOfDay: Date) =>
  ({ status, date, matches }: OnetimerSnapshot): OnetimerPlan | null => {
    if (!date || date > endOfDay || NOT_ACTIVATABLE.includes(status)) {
      return null;
    }
    const matched = matches.filter(
      (match) => match.status === OpportunityVolunteerStatusType.MATCHED,
    );
    if (!matched.length) {
      return null;
    }
    return {
      opportunityStatus: OpportunityStatusType.ACTIVE,
      matches: matched.map((match) => ({
        ...match,
        status: OpportunityVolunteerStatusType.ACTIVE,
      })),
    };
  };

export async function activateDueOnetimers(
  fastify: FastifyInstance,
): Promise<void> {
  const { endOfDay } = berlinDayBoundaries(berlinToday());

  const candidates = await buildOnetimerOpportunityQuery(fastify)
    .andWhere("opportunity.status NOT IN (:...notActivatable)", {
      notActivatable: NOT_ACTIVATABLE,
    })
    .andWhere("onetimer.date <= :endOfDay", { endOfDay })
    .andWhere("opportunityVolunteer.status = :matched", {
      matched: OpportunityVolunteerStatusType.MATCHED,
    })
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
        activationPlan(endOfDay),
        "activateDueOnetimers: failed to activate opportunity and its volunteer(s)",
      ),
    );
  }
  logOnetimerOutcomes("activateDueOnetimers", outcomes);
}
