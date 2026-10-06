import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import {
  CommunicationType,
  Lang,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
} from "need4deed-sdk";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import {
  updateOpportunityMatching,
  updateVolunteerMatching,
} from "../../../data/utils";
import logger from "../../../logger";
import { idParamSchema, responseSchema } from "../../schema";
import { ParamsId, ReplyMessage } from "../../types";
import { assertAgentOwnsOpportunity } from "../../utils/data/assert-agent-owns-opportunity";
import { addTranslatedFields } from "../../utils/data/for-routes";
import { logEmailCommunication } from "../../utils/data/log-email-communication";
import { syncVolunteerEngagement } from "../../utils/data/sync-volunteer-engagement";

// Sends the FIRST_INQUIRY "suggest" email for an OV that is (now) PENDING.
// Called both right after creation (POST, which can create straight into
// PENDING) and on a status transition into PENDING via PATCH (e.g. a
// PENDING→DECLINED→PENDING re-toggle). Fire-and-forget: callers invoke this
// without awaiting so a DB/send hiccup never affects the HTTP response.
async function triggerEmailSuggestion(
  fastify: FastifyInstance,
  id: number,
): Promise<void> {
  const opportunityVolunteerRepository =
    fastify.db.opportunityVolunteerRepository;
  const commRepo = fastify.db.communicationRepository;

  try {
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
      return;
    }
    // ACCOMPANYING opportunities have a single confirmed appointment
    // (onetimer), not a recurring dealTimeslot schedule — they go through
    // their own template rather than emailSuggestion's {{ schedule }}.
    const isAccompany =
      ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
    // Skip if FIRST_INQUIRY already sent (e.g. PENDING→DECLINED→PENDING).
    const alreadySent = await commRepo.findOne({
      where: {
        volunteerId: ov.volunteerId,
        opportunityId: ov.opportunityId,
        communicationType: CommunicationType.FIRST_INQUIRY,
      },
    });
    if (alreadySent) {
      return;
    }
    // Log before send; remove the dedup record on failure so the next toggle can retry.
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
        // emailSuggestionAccompanying renders the opportunity's requested
        // language titles (accompaniedpersonLanguage) — without this,
        // they'd be the raw (English) title rather than the German
        // translation, same rationale as be#849's fix for
        // emailIntroduction/emailAccompanyMatch. Scoped to this branch
        // only (be#1047 review): a translation-lookup failure here must
        // not block the plain, non-accompanying suggestion email, which
        // never reads dealLanguage at all.
        await addTranslatedFields([ov.opportunity], Lang.DE);
        await fastify.notify.emailSuggestionAccompanying(ov);
      } else {
        await fastify.notify.emailSuggestion(ov);
      }
      logger.debug(`emailSuggestion side-effect succeeded (ov ${id})`);
    } catch (sendErr) {
      await commRepo.remove(comm).catch(logger.error);
      throw sendErr;
    }
  } catch (err) {
    logger.error(`emailSuggestion side-effect failed (ov ${id}): ${err}`);
  }
}

const AGENT_SETTABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.ACTIVE,
  OpportunityVolunteerStatusType.PAST,
]);
// A match a coordinator already made: an NGO can't skip the matching step.
const AGENT_CHANGEABLE_STATUSES = new Set([
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
]);

function assertCoordinator(request: FastifyRequest): void {
  const role = request.authUser?.role;
  if (role !== UserRole.COORDINATOR && role !== UserRole.ADMIN) {
    throw new UnauthorizedError("Permission denied");
  }
}

// An NGO member may mark a match on their own opportunity Active or Past, or
// remove it; matching itself stays with coordinators.
async function assertCanChangeMatch(
  request: FastifyRequest,
  ov: OpportunityVolunteer,
  change: OpportunityVolunteerStatusType | "remove" | undefined,
): Promise<void> {
  if (request.authUser?.role !== UserRole.AGENT) {
    assertCoordinator(request);
    return;
  }
  const isAllowed =
    change === "remove" ||
    (change !== undefined &&
      AGENT_SETTABLE_STATUSES.has(change) &&
      AGENT_CHANGEABLE_STATUSES.has(ov.status));
  if (!isAllowed) {
    throw new UnauthorizedError("Permission denied");
  }
  await assertAgentOwnsOpportunity(
    request,
    ov.opportunityId,
    ov.opportunity?.agentId,
  );
}

// Same rule as before the backend took this over: a match becoming Active sets
// Active; Past or removal only takes back an Active no other match supports.
async function syncEngagement(
  fastify: FastifyInstance,
  volunteerId: number,
  change: OpportunityVolunteerStatusType | "remove",
): Promise<void> {
  const mode =
    change === OpportunityVolunteerStatusType.ACTIVE
      ? "follow"
      : change === OpportunityVolunteerStatusType.PAST || change === "remove"
        ? "release"
        : undefined;
  if (!mode) {
    return;
  }
  try {
    await syncVolunteerEngagement(
      fastify.db.opportunityVolunteerRepository.manager,
      volunteerId,
      mode,
    );
  } catch (err) {
    logger.error(`engagement sync failed (volunteer ${volunteerId}): ${err}`);
  }
}

export default async function m2mOpportunityVolunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  fastify.addHook("onRequest", fastify.authenticate());

  fastify.post<{
    Body: Omit<OpportunityVolunteer, "opportunity" | "volunteer">;
    Reply: ReplyMessage;
  }>(
    "/",
    {
      schema: {
        body: { $ref: "ApiVolunteerOpportunityPost#" },
        response: responseSchema({ statusCode: 201 }),
      },
    },
    async (request, reply) => {
      assertCoordinator(request);

      const opportunityVolunteerRepository =
        fastify.db.opportunityVolunteerRepository;

      const { opportunityId, volunteerId } = request.body;

      // Surface the duplicate-pair case as 409 up front (the DB unique
      // constraint on (opportunityId, volunteerId) remains the ultimate
      // guard for the rare race).
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

      const opportunityVolunteer = new OpportunityVolunteer(request.body);
      await opportunityVolunteerRepository.save(opportunityVolunteer);

      if (
        opportunityVolunteer.status === OpportunityVolunteerStatusType.PENDING
      ) {
        triggerEmailSuggestion(fastify, opportunityVolunteer.id);
      }

      return reply.status(201).send({
        message: `Created M2M opportunityId:${opportunityVolunteer.opportunityId}, volunteerId:${opportunityVolunteer.volunteerId}, status:${opportunityVolunteer.status}.`,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Reply: null;
    Body: { status: OpportunityVolunteerStatusType };
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
          relations: { opportunity: true },
        },
      );

      if (!opportunityVolunteer) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      const prevStatus = opportunityVolunteer.status;
      const nextStatus = request.body.status;

      await assertCanChangeMatch(request, opportunityVolunteer, nextStatus);

      // Only the status: the body schema also allows ids, which an NGO caller must not move.
      opportunityVolunteerRepository.merge(opportunityVolunteer, {
        status: nextStatus,
      });
      await opportunityVolunteerRepository.save(opportunityVolunteer, {
        reload: true,
      });

      if (nextStatus && nextStatus !== prevStatus) {
        await syncEngagement(
          fastify,
          opportunityVolunteer.volunteerId,
          nextStatus,
        );
        const commRepo = fastify.db.communicationRepository;

        if (nextStatus === OpportunityVolunteerStatusType.PENDING) {
          triggerEmailSuggestion(fastify, id);
        } else if (nextStatus === OpportunityVolunteerStatusType.MATCHED) {
          (async () => {
            try {
              // findOne inside the IIFE: handler returns 204 immediately;
              // a DB hiccup here doesn't affect the HTTP response.
              const ov = await opportunityVolunteerRepository.findOne({
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
                return;
              }
              // emailIntroduction/emailAccompanyMatch render the
              // volunteer's language/skill titles, and
              // emailAccompanyMatchVolunteer the opportunity's own requested
              // languages (fe#1036 review) — without this, they'd always be
              // the raw (English) title rather than the German translation
              // (be#849).
              await addTranslatedFields(
                [ov.volunteer, ov.opportunity],
                Lang.DE,
              );
              const isAccompany =
                ov.opportunity?.type === ProfileVolunteeringType.ACCOMPANYING;
              const commType = isAccompany
                ? CommunicationType.ACCOMPANYING_MATCHED
                : CommunicationType.MATCHED;
              // Skip if a match email was already sent for this pair.
              const alreadySent = await commRepo.findOne({
                where: {
                  volunteerId: ov.volunteerId,
                  opportunityId: ov.opportunityId,
                  communicationType: commType,
                },
              });
              if (alreadySent) {
                return;
              }
              if (isAccompany) {
                // Log before send; remove the dedup record on failure so the next toggle can retry.
                const comm = await logEmailCommunication(
                  commRepo,
                  CommunicationType.ACCOMPANYING_MATCHED,
                  {
                    volunteerId: ov.volunteerId,
                    opportunityId: ov.opportunityId,
                  },
                );
                try {
                  await fastify.notify.emailAccompanyMatch(ov);
                } catch (sendErr) {
                  await commRepo.remove(comm).catch(logger.error);
                  throw sendErr;
                }
                // Separate try/catch: this dedup record (and the NGO email
                // it guards) must not be rolled back and resent just
                // because the volunteer-facing email failed independently —
                // that would duplicate the already-successful NGO email on
                // the next status toggle. There's no retry path for this
                // send specifically (nothing re-triggers it), so failure
                // must page a human via opsAlert rather than only log —
                // otherwise a matched volunteer could silently never learn
                // their appointment's details.
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
                const comm = await logEmailCommunication(
                  commRepo,
                  CommunicationType.MATCHED,
                  {
                    volunteerId: ov.volunteerId,
                    opportunityId: ov.opportunityId,
                  },
                );
                try {
                  await fastify.notify.emailIntroduction(ov);
                } catch (sendErr) {
                  await commRepo.remove(comm).catch(logger.error);
                  throw sendErr;
                }
              }
            } catch (err) {
              logger.error(
                `emailMatched side-effect failed (ov ${id}): ${err}`,
              );
            }
          })();
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
        relations: { opportunity: true },
      });

      if (!m2mInstance) {
        throw new NotFoundError(`There's no M2M relation id:${id}`);
      }

      await assertCanChangeMatch(request, m2mInstance, "remove");

      await opportunityVolunteerRepository.delete({ id });
      await updateVolunteerMatching(m2mInstance.volunteerId);
      await updateOpportunityMatching(m2mInstance.opportunityId);
      await syncEngagement(fastify, m2mInstance.volunteerId, "remove");

      return reply.status(204).send();
    },
  );
}
