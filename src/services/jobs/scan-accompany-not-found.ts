import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
} from "need4deed-sdk";
import { Between, In } from "typeorm";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
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
      type: ProfileVolunteeringType.ACCOMPANYING as never,
      status: In([
        OpportunityStatusType.NEW,
        OpportunityStatusType.SEARCHING,
        OpportunityStatusType.ACTIVE,
      ]),
      accompanying: { date: Between(startOfDay, endOfDay) },
    },
    relations: [
      "accompanying",
      "accompanying.postcode",
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
      const alreadySent = await fastify.db.communicationRepository.findOne({
        where: {
          opportunityId: opp.id,
          communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
        },
      });
      if (alreadySent) {
        continue;
      }

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
