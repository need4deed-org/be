import { FastifyInstance } from "fastify";
import logger from "../../logger";
import {
  recordOpportunityStatusEvents,
  recordVolunteerSnapshots,
} from "../../server/utils/data/record-statistics-events";

export async function recordStatisticsEvents(
  fastify: FastifyInstance,
): Promise<void> {
  const manager = fastify.db.opportunityRepository.manager;
  const opportunities = await recordOpportunityStatusEvents(manager);
  const volunteers = await recordVolunteerSnapshots(manager);
  logger.info(
    { ...opportunities, ...volunteers },
    "scheduler: recorded statistics events",
  );
}
