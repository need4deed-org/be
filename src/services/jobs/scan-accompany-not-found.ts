import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
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

  if (!candidates.length) {return;}

  // Fix 10: bulk dedup query — one DB round-trip instead of N per-item findOne calls.
  const sentComms = await fastify.db.communicationRepository.find({
    where: {
      opportunityId: In(candidates.map((c) => c.id)),
      communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
    },
    select: ["opportunityId", "date"],
  });
  // Fix 6: dedup only suppresses if the email was sent AFTER the last opportunity
  // update — allows re-notification when a match falls through (bumps updatedAt).
  const lastSentMap = new Map<number, Date>();
  for (const c of sentComms) {
    const prev = lastSentMap.get(c.opportunityId!);
    if (!prev || c.date > prev) {lastSentMap.set(c.opportunityId!, c.date);}
  }

  for (const opp of candidates) {
    try {
      const lastSent = lastSentMap.get(opp.id);
      if (lastSent && lastSent > opp.updatedAt) {continue;}

      // Fix 4: log before send; remove the dedup record on send failure so the
      // next run can retry rather than being permanently suppressed.
      const comm = await logEmailCommunication(
        fastify.db.communicationRepository,
        CommunicationType.ACCOMPANYING_NOT_FOUND,
        { opportunityId: opp.id },
      );
      try {
        await fastify.notify.emailAccompanyNotFound(opp);
      } catch (sendErr) {
        await fastify.db.communicationRepository.remove(comm);
        throw sendErr;
      }
    } catch (err) {
      logger.error(`scanAccompanyNotFound: opp ${opp.id} failed: ${err}`);
    }
  }
}
