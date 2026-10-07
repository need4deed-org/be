import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import logger from "../../../logger";
import { syncVolunteerEngagement } from "./sync-volunteer-engagement";

interface VolunteerStatusUpdate {
  volunteer: OpportunityVolunteer;
  status: OpportunityVolunteerStatusType;
}

export async function applyOnetimerTransition(
  fastify: FastifyInstance,
  opportunity: Opportunity,
  opportunityStatus: OpportunityStatusType,
  volunteerUpdates: VolunteerStatusUpdate[],
  errorMessage: string,
): Promise<void> {
  const originalOpportunityStatus = opportunity.status;
  const originalVolunteerStatuses = volunteerUpdates.map(
    ({ volunteer }) => volunteer.status,
  );

  try {
    await fastify.db.opportunityRepository.manager.transaction(
      async (manager: EntityManager) => {
        opportunity.status = opportunityStatus;
        await manager.save(Opportunity, opportunity);

        const ordered = [...volunteerUpdates].sort(
          (a, b) =>
            a.volunteer.volunteerId - b.volunteer.volunteerId ||
            a.volunteer.id - b.volunteer.id,
        );
        for (const { volunteer, status } of ordered) {
          volunteer.status = status;
          await manager.save(OpportunityVolunteer, volunteer);
        }

        const volunteerIds = new Set(
          volunteerUpdates.map(({ volunteer }) => volunteer.volunteerId),
        );
        for (const volunteerId of volunteerIds) {
          await syncVolunteerEngagement(manager, volunteerId);
        }
      },
    );
  } catch (err) {
    opportunity.status = originalOpportunityStatus;
    volunteerUpdates.forEach(({ volunteer }, i) => {
      volunteer.status = originalVolunteerStatuses[i];
    });

    logger.error(
      {
        err,
        opportunityId: opportunity.id,
        opportunityVolunteerIds: volunteerUpdates.map((u) => u.volunteer.id),
      },
      errorMessage,
    );
  }
}
