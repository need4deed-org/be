import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { lockParents } from "../../../data/subscribers/opportunity-volunteer.subscriber";
import logger from "../../../logger";

export type OnetimerSnapshot = {
  status: OpportunityStatusType;
  date: Date | undefined;
  matches: Pick<OpportunityVolunteer, "id" | "volunteerId" | "status">[];
};

export type OnetimerPlan = {
  opportunityStatus: OpportunityStatusType;
  matches: {
    id: number;
    volunteerId: number;
    status: OpportunityVolunteerStatusType;
  }[];
};

export type OnetimerTransitionOutcome = "applied" | "skipped" | "failed";

// Match writes lock their opportunity first, so under this lock the opportunity and its matches can't change.
async function readLocked(
  manager: EntityManager,
  opportunityId: number,
): Promise<OnetimerSnapshot | undefined> {
  await lockParents(
    { manager, queryRunner: manager.queryRunner! },
    { opportunityIds: [opportunityId], volunteerIds: [] },
  );
  const opportunity = await manager.findOne(Opportunity, {
    relations: { onetimer: true },
    select: { id: true, status: true, onetimer: { id: true, date: true } },
    where: { id: opportunityId },
  });
  if (!opportunity) {
    return undefined;
  }
  const matches = await manager.find(OpportunityVolunteer, {
    select: { id: true, volunteerId: true, status: true },
    where: { opportunityId },
    order: { id: "ASC" },
  });
  return {
    status: opportunity.status,
    date: opportunity.onetimer?.date,
    matches,
  };
}

export async function applyOnetimerTransition(
  fastify: FastifyInstance,
  opportunityId: number,
  plan: (snapshot: OnetimerSnapshot) => OnetimerPlan | null,
  errorMessage: string,
): Promise<OnetimerTransitionOutcome> {
  let opportunityVolunteerIds: number[] = [];
  try {
    return await fastify.db.opportunityRepository.manager.transaction(
      async (manager): Promise<OnetimerTransitionOutcome> => {
        const snapshot = await readLocked(manager, opportunityId);
        const transition = snapshot && plan(snapshot);
        if (!transition) {
          return "skipped";
        }

        const matches = [...transition.matches].sort(
          (a, b) => a.volunteerId - b.volunteerId || a.id - b.id,
        );
        opportunityVolunteerIds = matches.map(({ id }) => id);
        await lockParents(
          { manager, queryRunner: manager.queryRunner! },
          {
            opportunityIds: [],
            volunteerIds: [...new Set(matches.map((m) => m.volunteerId))],
          },
        );
        await manager.update(
          Opportunity,
          { id: opportunityId },
          { status: transition.opportunityStatus },
        );
        for (const { id, status } of matches) {
          await manager.save(OpportunityVolunteer, { id, status });
        }
        return "applied";
      },
    );
  } catch (err) {
    logger.error({ err, opportunityId, opportunityVolunteerIds }, errorMessage);
    return "failed";
  }
}

export function logOnetimerOutcomes(
  job: string,
  outcomes: OnetimerTransitionOutcome[],
): void {
  const count = (outcome: OnetimerTransitionOutcome) =>
    outcomes.filter((o) => o === outcome).length;
  logger.info(
    `${job}: ${outcomes.length} candidates, ${count("applied")} applied, ${count("skipped")} skipped (changed meanwhile), ${count("failed")} failed`,
  );
}
