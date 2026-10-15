import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
import {
  appointmentsDue,
  berlinDayBoundaries,
  berlinToday,
} from "./german-holidays";
import { reportCronFailure } from "./report-cron-failure";

const JOB = "scanAccompanyNotFound";
const MATCHED_STATUSES = [
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
];

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
      !opp.opportunityVolunteer?.some((ov) =>
        MATCHED_STATUSES.includes(ov.status),
      ),
  );

  const startOfToday = berlinDayBoundaries(berlinToday()).startOfDay;
  for (const opp of candidates) {
    await notifyAndClose(fastify, opp, startOfToday);
  }
}

async function notifyAndClose(
  fastify: FastifyInstance,
  opp: Opportunity,
  startOfToday: Date,
): Promise<void> {
  const item = `opportunity ${opp.id}`;
  const commRepo = fastify.db.communicationRepository;

  const emailedToday = await commRepo.findOne({
    where: {
      opportunityId: opp.id,
      communicationType: CommunicationType.ACCOMPANYING_NOT_FOUND,
      date: MoreThanOrEqual(startOfToday),
    },
  });
  if (emailedToday) {
    return;
  }

  try {
    const comm = await logEmailCommunication(
      commRepo,
      CommunicationType.ACCOMPANYING_NOT_FOUND,
      { opportunityId: opp.id },
    );
    try {
      await fastify.cronNotify.emailAccompanyNotFound(opp);
    } catch (sendErr) {
      await commRepo.remove(comm).catch((removeErr) => {
        logger.error(
          `${JOB}: dedup rollback failed (${item}, comm ${comm.id}): ${removeErr}`,
        );
      });
      throw sendErr;
    }
  } catch (err) {
    await reportCronFailure(fastify, JOB, item, err, "not emailed");
    return;
  }

  try {
    await fastify.db.opportunityRepository.update(opp.id, {
      status: OpportunityStatusType.INACTIVE,
    });
  } catch (err) {
    await reportCronFailure(
      fastify,
      JOB,
      item,
      err,
      "emailed but not set to inactive",
    );
  }
}
