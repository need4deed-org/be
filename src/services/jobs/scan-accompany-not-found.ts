import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { Between, In } from "typeorm";
import logger from "../../logger";
import {
  addWorkingDays,
  berlinDayBoundaries,
  berlinToday,
} from "./german-holidays";

export async function scanAccompanyNotFound(
  fastify: FastifyInstance,
): Promise<void> {
  const targetDay = addWorkingDays(berlinToday(), 4);
  const { startOfDay, endOfDay } = berlinDayBoundaries(targetDay);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.ACCOMPANYING as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      onetimer: { date: Between(startOfDay, endOfDay) },
    },
    relations: [
      "accompanying",
      "accompanying.postcode",
      "onetimer",
      "contactPerson",
      "contactPerson.users",
      "district",
      "opportunityVolunteer",
    ],
  });

  const candidates = opps.filter(
    (opp) =>
      !opp.opportunityVolunteer?.some(
        (ov) => ov.status === OpportunityVolunteerStatusType.MATCHED,
      ),
  );

  // Posted to Slack for coordinators (be#1088): nothing is recorded in
  // Communication; the target day moves with each working day, so each
  // opportunity comes up on one run.
  for (const opp of candidates) {
    try {
      await fastify.cronNotify.emailAccompanyNotFound(opp);
    } catch (err) {
      logger.error(`scanAccompanyNotFound: opp ${opp.id} failed: ${err}`);
    }
  }
}
