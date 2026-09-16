import { FastifyInstance } from "fastify";
import { OpportunityType } from "need4deed-sdk";
import { SelectQueryBuilder } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";

// Shared by activateDueOnetimers and scanExpiredOnetimers — both scan
// single-occurrence (ACCOMPANYING/EVENTS) opportunities around their
// onetimer date and need the same onetimer/opportunityVolunteer relations,
// so a status or date guard added to one and not the other silently drifts
// the two jobs out of sync (be#987 review).
export function buildOnetimerOpportunityQuery(
  fastify: FastifyInstance,
): SelectQueryBuilder<Opportunity> {
  return fastify.db.opportunityRepository
    .createQueryBuilder("opportunity")
    .leftJoinAndSelect("opportunity.onetimer", "onetimer")
    .leftJoinAndSelect(
      "opportunity.opportunityVolunteer",
      "opportunityVolunteer",
    )
    .where("opportunity.type IN (:...types)", {
      types: [OpportunityType.ACCOMPANYING, OpportunityType.EVENTS],
    });
}
