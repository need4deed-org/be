import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import { appointmentsDue, berlinToday } from "./german-holidays";
import { reportCronFailure } from "./report-cron-failure";

export async function scanAccompanyNotFound(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
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

  for (const opp of candidates) {
    try {
      await fastify.cronNotify.emailAccompanyNotFound(opp);
    } catch (err) {
      await reportCronFailure(
        fastify,
        "scanAccompanyNotFound",
        `opportunity ${opp.id}`,
        err,
      );
    }
  }
}
