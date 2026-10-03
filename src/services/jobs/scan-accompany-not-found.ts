import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import logger from "../../logger";
import { appointmentsDue, berlinToday } from "./german-holidays";

export async function scanAccompanyNotFound(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
  // Appointments 4 working days ahead, with the weekend or holidays after
  // that day (be#1088).
  const { from, to } = appointmentsDue(today, 4);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.ACCOMPANYING as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      onetimer: { date: And(MoreThanOrEqual(from), LessThan(to)) },
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
