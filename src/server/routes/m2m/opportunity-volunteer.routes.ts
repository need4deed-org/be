import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  ApiOpportunityVolunteerPatch,
  ApiOpportunityVolunteerPost,
  CommunicationType,
  Lang,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
} from "need4deed-sdk";
import {
  BadRequestError,
  ConflictError,
  EmailAlreadySentError,
  EmailNotSentError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import logger from "../../../logger";
import { SuspendedEmailError } from "../../../services/notify";
import { UNRESOLVED_PLACEHOLDER_RE } from "../../../services/notify/validate-email-message";
import { errorName } from "../../../services/utils";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { assertAgentOwnsOpportunity } from "../../utils/data/assert-agent-owns-opportunity";
import { addTranslatedFields } from "../../utils/data/for-routes";
import { isStaffRole } from "../../utils/data/is-staff-role";
import { logEmailCommunication } from "../../utils/data/log-email-communication";
import { deleteMatch } from "../../utils/data/sync-volunteer-engagement";

async function sendSuggestionEmail(
  fastify: FastifyInstance,
  id: number,
  emailNote: string | undefined,
): Promise<boolean> {
  const opportunityVolunteerRepository =
    fastify.db.opportunityVolunteerRepository;
  const commRepo = fastify.db.communicationRepository;

  logger.debug(`emailSuggestion side-effect triggered (ov ${id})`);
  const ov = await opportunityVolunteerRepository.findOne({
    where: { id },
    relations: [
      "volunteer.person",
      "volunteer.person.users",
      "opportunity.deal.postcode",
      "opportunity.deal.dealTimeslot.timeslot",
      "opportunity.deal.dealLanguage.language",
      "opportunity.accompanying.postcode",
      "opportunity.onetimer",
      "opportunity.submittedByPerson",
      "opportunity.contactPerson",
    ],
  });
  if (!ov) {
    return false;
  }
  const isAccompany =
    ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
  const alreadySent = await commRepo.findOne({
    where: {
      volunteerId: ov.volunteerId,
      opportunityId: ov.opportunityId,
      communicationType: CommunicationType.FIRST_INQUIRY,
    },
  });
  if (alreadySent) {
    return false;
  }
  const comm = await logEmailCommunication(
    commRepo,
    CommunicationType.FIRST_INQUIRY,
    {
      volunteerId: ov.volunteerId,
      opportunityId: ov.opportunityId,
    },
  );
  try {
    if (isAccompany) {
      await addTranslatedFields([ov.opportunity], Lang.DE);
      await fastify.notify.emailSuggestionAccompanying(ov, emailNote);
    } else {
      await fastify.notify.emailSuggestion(ov, emailNote);
    }
    logger.debug(`emailSuggestion side-effect succeeded (ov ${id})`);
  } catch (sendErr) {
    await commRepo.remove(comm).catch(logger.error);
    throw sendErr;
  }
  return true;
}

function matchedCommunicationType(
  opportunityType: ProfileVolunteeringType | undefined,
): CommunicationType {
  return opportunityType === ProfileVolunteeringType.ACCOMPANYING
    ? CommunicationType.ACCOMPANYING_MATCHED
    : CommunicationType.MATCHED;
}

function emailCommunicationType(
  status: OpportunityVolunteerStatusType,
  opportunityType: ProfileVolunteeringType | undefined,
): CommunicationType | undefined {
  if (status === OpportunityVolunteerStatusType.PENDING) {
    return CommunicationType.FIRST_INQUIRY;
  }
  if (status === OpportunityVolunteerStatusType.MATCHED) {
    return matchedCommunicationType(opportunityType);
  }
  return undefined;
}

async function assertEmailNoteDeliverable(
  fastify: FastifyInstance,
  emailNote: string | undefined,
  match: { opportunityId: number; volunteerId: number },
  emailStatus: OpportunityVolunteerStatusType | undefined,
): Promise<void> {
  if (!emailNote?.trim()) {
    return;
  }
  if (UNRESOLVED_PLACEHOLDER_RE.test(emailNote)) {
    throw new BadRequestError(
      "emailNote can't contain {{ … }}: the email would be held back as an unfilled template.",
    );
  }
  const opportunity =
    emailStatus === OpportunityVolunteerStatusType.MATCHED
      ? await fastify.db.opportunityRepository.findOne({
          select: { id: true, type: true },
          where: { id: match.opportunityId },
        })
      : null;
  const communicationType =
    emailStatus && emailCommunicationType(emailStatus, opportunity?.type);
  if (!communicationType) {
    throw new BadRequestError(
      "emailNote is only accepted when the request sends an email: a POST creating a pending match, or a PATCH changing the status to pending or matched.",
    );
  }
  const alreadySent = await fastify.db.communicationRepository.exists({
    where: {
      opportunityId: match.opportunityId,
      volunteerId: match.volunteerId,
      communicationType,
    },
  });
  if (alreadySent) {
    throw new EmailAlreadySentError(
      "That email was already sent for this match, so the note would not be delivered.",
    );
  }
}

async function sendMatchedEmails(
  fastify: FastifyInstance,
  id: number,
  emailNote: string | undefined,
): Promise<boolean> {
  const commRepo = fastify.db.communicationRepository;
  const ov = await fastify.db.opportunityVolunteerRepository.findOne({
    where: { id },
    relations: [
      "volunteer.person",
      "volunteer.person.users",
      "volunteer.deal.dealLanguage.language",
      "volunteer.deal.dealSkill.skill",
      "volunteer.deal.dealTimeslot.timeslot",
      "opportunity.deal.dealLanguage.language",
      "opportunity.submittedByPerson",
      "opportunity.submittedByPerson.users",
      "opportunity.contactPerson",
      "opportunity.contactPerson.users",
      "opportunity.agent.address.postcode",
      "opportunity.agent.agentPerson.person",
      "opportunity.agent.agentPerson.person.users",
      "opportunity.accompanying.postcode",
      "opportunity.onetimer",
      "opportunity.district",
    ],
  });
  if (!ov) {
    return false;
  }
  await addTranslatedFields([ov.volunteer, ov.opportunity], Lang.DE);
  const isAccompany =
    ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
  const commType = matchedCommunicationType(ov.opportunity?.type);
  const alreadySent = await commRepo.findOne({
    where: {
      volunteerId: ov.volunteerId,
      opportunityId: ov.opportunityId,
      communicationType: commType,
    },
  });
  if (alreadySent) {
    return false;
  }
  if (isAccompany) {
    const comm = await logEmailCommunication(commRepo, commType, {
      volunteerId: ov.volunteerId,
      opportunityId: ov.opportunityId,
    });
    try {
      await fastify.notify.emailAccompanyMatch(ov, emailNote);
    } catch (sendErr) {
      await commRepo.remove(comm).catch(logger.error);
      throw sendErr;
    }
    try {
      await fastify.notify.emailAccompanyMatchVolunteer(ov);
    } catch (volunteerSendErr) {
      logger.error(
        `emailAccompanyMatchVolunteer failed (ov ${id}): ${volunteerSendErr}`,
      );
      fastify.notify
        .opsAlert(
          `emailAccompanyMatchVolunteer failed for ov ${id} (volunteer ${ov.volunteerId}, opportunity ${ov.opportunityId}) — the volunteer was not sent their appointment details: ${volunteerSendErr}`,
        )
        .catch(logger.error);
    }
  } else {
    const comm = await logEmailCommunication(commRepo, commType, {
      volunteerId: ov.volunteerId,
      opportunityId: ov.opportunityId,
    });
    try {
      await fastify.notify.emailIntroduction(ov, emailNote);
    } catch (sendErr) {
      await commRepo.remove(comm).catch(logger.error);
      throw sendErr;
    }
  }
  return true;
}

async function deliverMatchEmail(
  label: string,
  id: number,
  emailNote: string | undefined,
  send: (emailNote: string | undefined) => Promise<boolean>,
): Promise<void> {
  if (!emailNote?.trim()) {
    send(undefined).catch((err) =>
      logger.error(`${label} side-effect failed (ov ${id}): ${err}`),
    );
    return;
  }
  const notSent =
    "The status was saved, but the email with your note was not sent";
  let sent: boolean;
  try {
    sent = await send(emailNote);
  } catch (err) {
    logger.error(`${label} with a note failed (ov ${id}): ${errorName(err)}`);
    throw new EmailNotSentError(
      err instanceof SuspendedEmailError
        ? `${notSent}: ${err.problems.join("; ")}`
        : `${notSent}.`,
    );
  }
  if (!sent) {
    throw new EmailNotSentError(`${notSent}.`);
  }
}

const AGENT_SETTABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.ACTIVE,
  OpportunityVolunteerStatusType.PAST,
]);
const AGENT_CHANGEABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
]);
const AGENT_REMOVABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.PENDING,
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
]);

function assertCoordinator(request: FastifyRequest): void {
  if (!isStaffRole(request.authUser?.role)) {
    throw new UnauthorizedError("Permission denied");
  }
}

async function assertCanChangeMatch(
  fastify: FastifyInstance,
  request: FastifyRequest,
  ov: OpportunityVolunteer,
  change: OpportunityVolunteerStatusType | "remove" | undefined,
): Promise<void> {
  if (request.authUser?.role !== UserRole.AGENT) {
    assertCoordinator(request);
    return;
  }
  const opportunity = await fastify.db.opportunityRepository.findOne({
    select: { id: true, agentId: true },
    where: { id: ov.opportunityId },
  });
  await assertAgentOwnsOpportunity(
    request,
    ov.opportunityId,
    opportunity?.agentId,
  );
  const agent = await fastify.db.agentRepository.findOne({
    select: { id: true, engagementStatus: true },
    where: { id: opportunity?.agentId },
  });
  if (agent?.engagementStatus === AgentEngagementStatusType.INACTIVE) {
    throw new UnauthorizedError("This NGO is inactive.");
  }
  const isAllowed =
    change === "remove"
      ? AGENT_REMOVABLE_STATUSES.has(ov.status)
      : change !== undefined &&
        AGENT_SETTABLE_STATUSES.has(change) &&
        AGENT_CHANGEABLE_STATUSES.has(ov.status);
  if (!isAllowed) {
    throw new UnauthorizedError("Permission denied");
  }
}

export default async function m2mOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.post<{
    Body: ApiOpportunityVolunteerPost;
    Reply: ReplyMessage;
  }>(
    "/",
    {
      preValidation: async (request) => assertCoordinator(request),
      schema: {
        body: { $ref: "ApiVolunteerOpportunityPost#" },
        response: responseSchema({ statusCode: 201 }),
      },
    },
    async (request, reply) => {
      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const { emailNote, ...body } = request.body;
      const { opportunityId, volunteerId } = body;

      if (
        await opportunityVolunteerRepository.findOneBy({
          opportunityId,
          volunteerId,
        })
      ) {
        throw new ConflictError(
          `A match already exists for opportunityId:${opportunityId}, volunteerId:${volunteerId}.`,
        );
      }

      await assertEmailNoteDeliverable(
        fastify,
        emailNote,
        { opportunityId, volunteerId },
        body.status === OpportunityVolunteerStatusType.PENDING
          ? body.status
          : undefined,
      );

      const opportunityVolunteer = new OpportunityVolunteer(body);
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        data: { actorUserId: request.authUser?.id },
      });

      if (
        opportunityVolunteer.status === OpportunityVolunteerStatusType.PENDING
      ) {
        await deliverMatchEmail(
          "emailSuggestion",
          opportunityVolunteer.id,
          emailNote,
          (note) => sendSuggestionEmail(fastify, opportunityVolunteer.id, note),
        );
      }

      return reply.status(201).send({
        message: `Created M2M opportunityId:${opportunityVolunteer.opportunityId}, volunteerId:${opportunityVolunteer.volunteerId}, status:${opportunityVolunteer.status}.`,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: null;
    Body: ApiOpportunityVolunteerPatch;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiOpportunityVolunteerPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const opportunityVolunteer = await opportunityVolunteerRepository.findOne(
        {
          where: { id },
        },
      );

      if (!opportunityVolunteer) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      const { emailNote, status: nextStatus } = request.body;
      const prevStatus = opportunityVolunteer.status;

      await assertCanChangeMatch(
        fastify,
        request,
        opportunityVolunteer,
        nextStatus,
      );
      await assertEmailNoteDeliverable(
        fastify,
        emailNote,
        opportunityVolunteer,
        nextStatus !== prevStatus ? nextStatus : undefined,
      );

      opportunityVolunteerRepository.merge(opportunityVolunteer, {
        status: nextStatus,
      });
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        reload: true,
        data: { actorUserId: request.authUser?.id },
      });

      if (nextStatus !== prevStatus) {
        if (nextStatus === OpportunityVolunteerStatusType.PENDING) {
          await deliverMatchEmail("emailSuggestion", id, emailNote, (note) =>
            sendSuggestionEmail(fastify, id, note),
          );
        } else if (nextStatus === OpportunityVolunteerStatusType.MATCHED) {
          await deliverMatchEmail("emailMatched", id, emailNote, (note) =>
            sendMatchedEmails(fastify, id, note),
          );
        }
      }

      return reply.status(204).send();
    },
  );

  fastify.delete<{
    Params: ParamsId;
    Reply: null;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const m2mInstance = await opportunityVolunteerRepository.findOne({
        where: { id },
      });

      if (!m2mInstance) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      await assertCanChangeMatch(fastify, request, m2mInstance, "remove");

      await deleteMatch(
        opportunityVolunteerRepository.manager,
        m2mInstance,
        request.authUser?.id,
      );
      await updateVolunteerMatching(m2mInstance.volunteerId);
      await updateOpportunityMatching(m2mInstance.opportunityId);

      return reply.status(204).send();
    },
  );
}
