import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
} from "need4deed-sdk";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
import { addWorkingDays, berlinToday } from "./german-holidays";

export async function scanAccompanyNotFound(
  fastify: FastifyInstance,
): Promise<void> {
  const targetDay = addWorkingDays(berlinToday(), 4);
  const startOfDay = new Date(
    targetDay.getFullYear(),
    targetDay.getMonth(),
    targetDay.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfDay = new Date(
    targetDay.getFullYear(),
    targetDay.getMonth(),
    targetDay.getDate(),
    23,
    59,
    59,
    999,
  );

  const opps = await fastify.db.opportunityRepository.find({
    where: { type: ProfileVolunteeringType.ACCOMPANYING as never },
    relations: [
      "accompanying",
      "accompanying.postcode",
      "contactPerson",
      "contactPerson.users",
      "district",
      "opportunityVolunteer",
    ],
  });

  const candidates = opps.filter((opp) => {
    const date = opp.accompanying?.date;
    if (!date) {return false;}
    const d = new Date(date);
    if (d < startOfDay || d > endOfDay) {return false;}
    return !opp.opportunityVolunteer?.some(
      (ov) => ov.status === OpportunityVolunteerStatusType.MATCHED,
    );
  });

  for (const opp of candidates) {
    try {
      const alreadySent = await fastify.db.communicationRepository.findOne({
        where: {
          opportunityId: opp.id,
          communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
        },
      });
      if (alreadySent) {continue;}

      await fastify.notify.emailAccompanyNotFound(opp);
      await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.ACCOMPANYING_NOT_FOUND,
        { opportunityId: opp.id },
      );
    } catch (err) {
      logger.error(`scanAccompanyNotFound: opp ${opp.id} failed: ${err}`);
    }
  }
}
