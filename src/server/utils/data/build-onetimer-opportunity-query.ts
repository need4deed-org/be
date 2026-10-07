import { FastifyInstance } from "fastify";
import { OpportunityType } from "need4deed-sdk";
import { SelectQueryBuilder } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";

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
