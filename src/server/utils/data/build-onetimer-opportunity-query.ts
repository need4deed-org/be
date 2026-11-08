import { FastifyInstance } from "fastify";
import { SelectQueryBuilder } from "typeorm";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { ONETIMER_OPPORTUNITY_TYPES } from "./onetimer-statuses";

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
      types: ONETIMER_OPPORTUNITY_TYPES,
    });
}
