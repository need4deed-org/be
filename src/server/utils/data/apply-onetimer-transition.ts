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
  try {
    await fastify.db.opportunityRepository.manager.transaction(
      async (manager: EntityManager) => {
        await manager.update(
          Opportunity,
          { id: opportunity.id },
          { status: opportunityStatus },
        );

        const ordered = [...volunteerUpdates].sort(
          (a, b) =>
            a.volunteer.volunteerId - b.volunteer.volunteerId ||
            a.volunteer.id - b.volunteer.id,
        );
        for (const { volunteer, status } of ordered) {
          await manager.save(
            OpportunityVolunteer,
            new OpportunityVolunteer({ ...volunteer, status }),
          );
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
