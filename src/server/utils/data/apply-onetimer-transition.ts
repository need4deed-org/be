import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { lockParents } from "../../../data/subscribers/opportunity-volunteer.subscriber";
import logger from "../../../logger";
import { syncVolunteerEngagement } from "./sync-volunteer-engagement";

interface VolunteerStatusUpdate {
  volunteer: Pick<OpportunityVolunteer, "id" | "volunteerId" | "status">;
  status: OpportunityVolunteerStatusType;
}

export type OnetimerTransitionOutcome = "applied" | "skipped" | "failed";

// Candidates were read outside this transaction: only rows still in the status read are written.
export async function applyOnetimerTransition(
  fastify: FastifyInstance,
  opportunity: Pick<Opportunity, "id" | "status">,
  opportunityStatus: OpportunityStatusType,
  volunteerUpdates: VolunteerStatusUpdate[],
  errorMessage: string,
): Promise<OnetimerTransitionOutcome> {
  try {
    return await fastify.db.opportunityRepository.manager.transaction(
      async (manager: EntityManager): Promise<OnetimerTransitionOutcome> => {
        const volunteerIds = [
          ...new Set(
            volunteerUpdates.map(({ volunteer }) => volunteer.volunteerId),
          ),
        ].sort((a, b) => a - b);
        await lockParents(
          { manager, queryRunner: manager.queryRunner! },
          { opportunityIds: [opportunity.id], volunteerIds },
        );

        const current = await manager.findOne(Opportunity, {
          select: { id: true, status: true },
          where: { id: opportunity.id },
        });
        if (current?.status !== opportunity.status) {
          logger.info(
            { opportunityId: opportunity.id },
            "onetimer transition skipped: the opportunity changed since it was read",
          );
          return "skipped";
        }

        await manager.update(
          Opportunity,
          { id: opportunity.id },
          { status: opportunityStatus },
        );

        const linkIds = volunteerUpdates.map(({ volunteer }) => volunteer.id);
        const currentLinks = linkIds.length
          ? await manager.find(OpportunityVolunteer, {
              select: { id: true, status: true },
              where: { id: In(linkIds) },
              order: { id: "ASC" },
              lock: { mode: "for_no_key_update" },
            })
          : [];
        const currentStatus = new Map(
          currentLinks.map(({ id, status }) => [id, status]),
        );

        const ordered = [...volunteerUpdates].sort(
          (a, b) =>
            a.volunteer.volunteerId - b.volunteer.volunteerId ||
            a.volunteer.id - b.volunteer.id,
        );
        const applied: VolunteerStatusUpdate[] = [];
        for (const update of ordered) {
          if (
            currentStatus.get(update.volunteer.id) !== update.volunteer.status
          ) {
            continue;
          }
          await manager.save(OpportunityVolunteer, {
            id: update.volunteer.id,
            status: update.status,
          });
          applied.push(update);
        }

        for (const volunteerId of new Set(
          applied.map(({ volunteer }) => volunteer.volunteerId),
        )) {
          await syncVolunteerEngagement(manager, volunteerId);
        }
        return "applied";
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
    return "failed";
  }
}
