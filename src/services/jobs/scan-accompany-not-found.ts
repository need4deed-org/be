import { FastifyInstance } from "fastify";
import {
  berlinToday,
  CommunicationType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { And, In, LessThan, MoreThanOrEqual } from "typeorm";
import Communication from "../../data/entity/communication.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import type { EmailDelivery } from "../../server/plugins/notify";
import { logEmailCommunication } from "../../server/utils/data/log-email-communication";
import { NO_MATCH_FOUND_WORKING_DAYS } from "../../server/utils/data/no-match-found";
import { SuspendedEmailError } from "../notify";
import { appointmentsDue, berlinDayBoundaries } from "./berlin-dates";
import { reportCronFailure } from "./report-cron-failure";

const JOB = "scanAccompanyNotFound";
const OPEN_STATUSES = [
  OpportunityStatusType.NEW,
  OpportunityStatusType.SEARCHING,
  OpportunityStatusType.ACTIVE,
];
const MATCHED_STATUSES = [
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
];

export async function scanAccompanyNotFound(
  fastify: FastifyInstance,
  today: Date = berlinToday(),
): Promise<void> {
  const { from, to } = appointmentsDue(today, NO_MATCH_FOUND_WORKING_DAYS);

  const opps = await fastify.db.opportunityRepository.find({
    where: {
      type: OpportunityType.ACCOMPANYING as never,
      status: In(OPEN_STATUSES),
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
  const removeLog = (comm: Communication) =>
    commRepo.remove(comm).catch((removeErr) => {
      logger.error(
        `${JOB}: dedup rollback failed (${item}, comm ${comm.id}): ${removeErr}`,
      );
    });

  try {
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

    const comm = await logEmailCommunication(
      commRepo,
      CommunicationType.ACCOMPANYING_NOT_FOUND,
      { opportunityId: opp.id },
    );
    let delivery: EmailDelivery;
    try {
      delivery = await fastify.cronNotify.emailAccompanyNotFound(opp);
    } catch (sendErr) {
      await removeLog(comm);
      throw sendErr;
    }
    if (delivery === "dry-run") {
      await removeLog(comm);
      return;
    }
  } catch (err) {
    if (err instanceof SuspendedEmailError) {
      logger.warn(`${JOB}: ${item} not emailed: ${err.message}`);
      return;
    }
    await reportCronFailure(fastify, JOB, item, err, "not emailed");
    return;
  }

  try {
    await closeIfStillUnmatched(fastify, opp.id);
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

async function closeIfStillUnmatched(
  fastify: FastifyInstance,
  opportunityId: number,
): Promise<void> {
  const matchedVolunteer = fastify.db.opportunityVolunteerRepository
    .createQueryBuilder("ov")
    .select("1")
    .where("ov.opportunityId = :opportunityId")
    .andWhere("ov.status IN (:...matchedStatuses)")
    .getQuery();

  await fastify.db.opportunityRepository
    .createQueryBuilder()
    .update()
    .set({ status: OpportunityStatusType.INACTIVE })
    .where("id = :opportunityId")
    .andWhere("status IN (:...openStatuses)")
    .andWhere(`NOT EXISTS (${matchedVolunteer})`)
    .setParameters({
      opportunityId,
      openStatuses: OPEN_STATUSES,
      matchedStatuses: MATCHED_STATUSES,
    })
    .execute();
}
