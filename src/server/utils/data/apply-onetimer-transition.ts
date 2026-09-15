import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import logger from "../../../logger";

interface VolunteerStatusUpdate {
  volunteer: OpportunityVolunteer;
  status: OpportunityVolunteerStatusType;
}

// Shared by activateDueOnetimers and scanExpiredOnetimers: saves the
// opportunity and the given volunteers in one transaction, so a save failure
// can't leave the opportunity in a new status while a volunteer is left
// stuck in its old one (be#988). Statuses are assigned immediately before
// each save (not upfront) so an in-memory entity's status still reflects
// reality if the transaction rolls back partway through.
export async function applyOnetimerTransition(
  fastify: FastifyInstance,
  opportunity: Opportunity,
  opportunityStatus: OpportunityStatusType,
  volunteerUpdates: VolunteerStatusUpdate[],
  errorMessage: string,
): Promise<void> {
  try {
    await fastify.db.opportunityRepository.manager.transaction(
      async (manager: EntityManager) => {
        opportunity.status = opportunityStatus;
        await manager.save(Opportunity, opportunity);

        for (const { volunteer, status } of volunteerUpdates) {
          volunteer.status = status;
          await manager.save(OpportunityVolunteer, volunteer);
        }
      },
    );
  } catch (err) {
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
