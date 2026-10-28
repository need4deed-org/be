import { FastifyInstance } from "fastify";
import {
  CommunicationType,
  ContactMethodType,
  ContactType,
} from "need4deed-sdk";
import { Repository } from "typeorm";
import Communication from "../../../data/entity/communication.entity";
import logger from "../../../logger";
import { errorSummary } from "../../../services/utils";

export async function logEmailCommunication(
  repo: Repository<Communication>,
  communicationType: CommunicationType,
  ids: {
    volunteerId?: number;
    opportunityId?: number;
    agentId?: number;
    userId?: number;
  },
): Promise<Communication> {
  return repo.save(
    new Communication({
      contactType: ContactType.TEXT_EMAIL,
      contactMethod: ContactMethodType.EMAIL,
      communicationType,
      ...ids,
    }),
  );
}

export async function removeUnsentEmailLog(
  fastify: FastifyInstance,
  comm: Communication,
  context?: string,
): Promise<void> {
  try {
    await fastify.db.communicationRepository.remove(comm);
  } catch (removeErr) {
    const subject = [
      context,
      comm.volunteerId && `volunteer ${comm.volunteerId}`,
      comm.opportunityId && `opportunity ${comm.opportunityId}`,
    ]
      .filter(Boolean)
      .join(", ");
    logger.error(
      `unsent ${comm.communicationType} email still logged (${subject}, communication ${comm.id}): ${errorSummary(removeErr)}`,
    );
    fastify.notify.opsAlert(
      `${comm.communicationType} email (${subject}) was not sent, but communication ${comm.id} could not be removed — it blocks a resend; delete it by hand.`,
    );
  }
}
