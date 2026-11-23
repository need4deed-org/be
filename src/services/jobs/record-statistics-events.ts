import { FastifyInstance } from "fastify";
import logger from "../../logger";
import {
  recordOpportunityStatusEvents,
  recordVolunteerSnapshots,
} from "../../server/utils/data/record-statistics-events";

export async function recordStatisticsSnapshots(
  fastify: FastifyInstance,
): Promise<void> {
  const recorded = await recordVolunteerSnapshots(
    fastify.db.volunteerRepository.manager,
  );
  logger.info(recorded, "scheduler: recorded volunteer statistics snapshots");
}

export async function recordStatisticsStatusEvents(
  fastify: FastifyInstance,
): Promise<void> {
  const recorded = await recordOpportunityStatusEvents(
    fastify.db.opportunityRepository.manager,
  );
  logger.info(recorded, "scheduler: recorded opportunity statistics events");
}
