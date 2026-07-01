import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { Between, In } from "typeorm";
import logger from "../../logger";
import {
  buildLastSentMap,
  logEmailCommunication,
} from "../../server/utils/data/log-email-communication";
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

  if (!candidates.length) {
    return;
  }

  const lastSentMap = await buildLastSentMap(
    fastify.db.communicationRepository,
    candidates.map((c) => c.id),
    CommunicationType.ACCOMPANYING_NOT_FOUND,
  );

  for (const opp of candidates) {
    try {
      const lastSent = lastSentMap.get(opp.id);
      if (lastSent && lastSent > opp.updatedAt) {
        continue;
      }

      const comm = await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.ACCOMPANYING_NOT_FOUND,
        { opportunityId: opp.id },
      );
      try {
        await fastify.notify.emailAccompanyNotFound(opp);
      } catch (sendErr) {
        await fastify.db.communicationRepository
          .remove(comm)
          .catch(logger.error);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanAccompanyNotFound: opp ${opp.id} failed: ${err}`);
    }
  }
}
