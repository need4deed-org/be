import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  AgentMembershipStatus,
  ApiOpportunityGet,
  ApiOpportunityPatch,
  CommunicationType,
  EntityTableName,
  Lang,
  OpportunityFormDataWithAgentSubmitter,
  OpportunityLegacyFormData,
  OpportunityLegacyType,
  OpportunitySortField,
  OpportunityType,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import { EntityManager, In } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { updateVolunteerMatching } from "../../../data/utils";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";
import logger from "../../../logger";
import {
  accompanyingParserOpportunity,
  dtoOpportunityGet,
  dtoOpportunityGetList,
  parseAccompDatetime,
  parseOpportunity,
  parseOpportunityLegacy,
} from "../../../services";
import { dealParserOpportunityCreate } from "../../../services/dto/parser-deal-opportunity-create";
import { assertValidMainCommunicationLanguages } from "../../../services/dto/parser-opportunity-patch-data";
import { getDateObj } from "../../../services/utils";
import {
  idParamSchema,
  opportunityCreateBodySchema,
  opportunityCreateResponseSchema,
  opportunityListQuerySchema,
  responseSchema,
} from "../../schema";
import {
  ParamsId,
  QuerystringOpportunityList,
  ReplyData,
  ReplyDataCount,
  ReplyMessage,
  RoutePrefix,
} from "../../types";
import {
  addAgentTypeServiceTranslations,
  addComments2Entity,
  assertAgentOwnsOpportunity,
  getCallerAgentIds,
  getCategoryToDealHandler,
  getDistrictToAgentHandler,
  getDistrictToOpportunityHandler,
  getOpportunityNotificationText,
  getOpportunityOrphanageAgent,
  getOpportunityWhere,
  getOrCreateTimeslot,
  getPostcode,
  getSkipTake,
  impliesAgentSearching,
  patchEntity,
  setAgentSearching,
  updateOptionList,
  upsertOnetimer,
  writeOpportunityLegacy,
} from "../../utils";
import { addTranslatedFields } from "../../utils/data/for-routes";
import { logEmailCommunication } from "../../utils/data/log-email-communication";
import {
  makePiiSerialization,
  maskForCaller,
} from "../../utils/pii/pre-serialization";
import opportunityLegacyRoutes from "./legacy.routes";
import opportunityEventRegistrationRoutes from "./opportunity-event-registration.routes";
import opportunityOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";

async function sendNewOpportunityEmail(
  fastify: FastifyInstance,
  id: number,
  relations: string[],
  notifyFn: (opp: Opportunity) => Promise<void>,
  label: string,
): Promise<void> {
  const opp = await fastify.db.opportunityRepository.findOne({
    where: { id },
    relations,
  });
  if (!opp) {
    return;
  }
  const alreadySent = await fastify.db.communicationRepository.findOne({
    where: {
      opportunityId: id,
      communicationType: CommunicationType.OPPORTUNITY_CONFIRMATION,
    },
  });
  if (alreadySent) {
    return;
  }
  const comm = await logEmailCommunication(
    fastify.db.communicationRepository,
    CommunicationType.OPPORTUNITY_CONFIRMATION,
    { opportunityId: id },
  );
  try {
    await notifyFn(opp);
  } catch (sendErr) {
    await fastify.db.communicationRepository.remove(comm).catch((removeErr) => {
      logger.error(
        `${label} dedup rollback failed (opp ${id}, comm ${comm.id}): ${removeErr}`,
      );
    });
    throw sendErr;
  }
}

// Shared by the REGULAR and EVENTS transition-out-of-ACCOMPANYING branches
// below (be#780) — an opportunity leaving ACCOMPANYING has no further use
// for its old Accompanying row, which still holds refugee PII (name/phone/
// email/address/language) that must not survive the type change. `onetimer`
// is only cleared alongside it for REGULAR, since EVENTS keeps reusing
// `onetimer` for the event's own date/time.
async function clearStaleAccompanying(
  manager: EntityManager,
  opportunity: Opportunity,
  { alsoClearOnetimer }: { alsoClearOnetimer: boolean },
): Promise<void> {
  await manager.update(Opportunity, opportunity.id, {
    accompanyingId: null,
    ...(alsoClearOnetimer ? { onetimerId: null } : {}),
  });
  if (opportunity.accompanyingId) {
    await manager.delete(Accompanying, opportunity.accompanyingId);
  }
  if (alsoClearOnetimer && opportunity.onetimerId) {
    await manager.delete(Onetimer, opportunity.onetimerId);
  }
}

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GETs open to any logged-in user (PII masked per role); writes stay
  // COORDINATOR-only (re-gated per-route), except PATCH /:id which also lets
  // an AGENT update the `statusOpportunity` of their own agent's opportunity.
  fastify.addHook("onRequest", fastify.authenticate());

  await fastify.register(opportunityLegacyRoutes, {
    prefix: RoutePrefix.LEGACY,
  });

  await fastify.register(opportunityOpportunityVolunteerRoutes, {
    prefix: `:id${RoutePrefix.VOLUNTEER_LINKED}`,
  });

  await fastify.register(opportunityEventRegistrationRoutes, {
    prefix: `:id${RoutePrefix.REGISTRATIONS}`,
  });

  fastify.get<{ Params: ParamsId; Replay: ReplyData<ApiOpportunityGet> }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        response: responseSchema("ApiOpportunityGet#"),
      },
    },
    async (request, reply) => {
      const id = request.params.id;
      const relations = [
        "accompanying",
        "accompanying.postcode",
        "onetimer",
        "deal.dealLanguage.language",
        "deal.dealActivity.activity",
        "deal.dealSkill.skill",
        "deal.dealDistrict.district",
        "deal.dealTimeslot.timeslot",
        "agent.agentPerson.person.address.postcode",
        "agent.address.postcode",
        "agent.district",
        "agent.agentType",
        "contactPerson",
        "submittedByPerson.agentPerson",
      ];

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOne({
        where: { id },
        relations,
      });

      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }
      await assertAgentOwnsOpportunity(
        request.authUser,
        id,
        opportunity.agentId,
      );

      const opportunityComments: Opportunity & { comments: Comment[] } =
        await addComments2Entity(opportunity);

      if (!opportunityComments.agent) {
        const agent = await getOpportunityOrphanageAgent();
        await opportunityRepository.update({ id }, { agentId: agent.id });
        opportunityComments.agent = agent;
        logger.warn(
          `Opportunity (id:${id}) has no agent, adding to orphanage agent.`,
        );
      }
      const { addDistrictToAgent, updates: districtUpdates } =
        getDistrictToAgentHandler(true);
      Object.assign(
        opportunityComments.agent,
        await addDistrictToAgent(opportunityComments.agent),
      );
      await addAgentTypeServiceTranslations([opportunityComments.agent]);

      if (districtUpdates.length) {
        const agentRepository = fastify.db.agentRepository;
        await agentRepository.save(districtUpdates);
      }

      // Resolved once here (rather than inside addDistrictToOpportunity) so
      // it can be reused below for accompanyingDetails.appointmentDistrict
      // without a second identical DB lookup. Gated on the current type
      // (like accompanyingForType in dto-opportunity.ts, be#780) so a stale
      // accompanying row on a non-ACCOMPANYING opportunity doesn't trigger a
      // lookup whose result would be discarded anyway.
      const accompanyingDistrict =
        opportunityComments.type === OpportunityType.ACCOMPANYING &&
        opportunityComments.accompanying?.postcode
          ? await getDistrictFromPostcode(
              opportunityComments.accompanying.postcode,
            )
          : null;

      const { addDistrictToOpportunity, updates: opportunityUpdates } =
        getDistrictToOpportunityHandler();
      Object.assign(
        opportunityComments,
        await addDistrictToOpportunity(
          opportunityComments,
          accompanyingDistrict,
        ),
      );

      if (opportunityUpdates.length) {
        const opportunityRepository = fastify.db.opportunityRepository;
        await opportunityRepository.save(opportunityUpdates);
      }

      // dtoOpportunityGet takes a handler-computed arg, so mask inline (rather
      // than via the makePiiSerialization hook) before serializing.
      await maskForCaller(request, opportunityComments);
      const data = dtoOpportunityGet(opportunityComments, accompanyingDistrict);

      return reply.status(200).send({ message: `Opportunity id:${id}`, data });
    },
  );

  fastify.get<{
    Querystring: QuerystringOpportunityList;
    // Handler sends entities; the DTO (ApiOpportunityGetList) runs in the
    // preSerialization hook.
    Reply: ReplyDataCount<Opportunity[]>;
  }>(
    "/",
    {
      schema: {
        querystring: opportunityListQuerySchema,
        response: responseSchema("ApiOpportunityGetList#", true),
      },
      preSerialization: makePiiSerialization(dtoOpportunityGetList),
    },
    async (request, reply) => {
      const [skip, take] = getSkipTake({
        page: request.query.page,
        limit: request.query.limit,
      });
      const order =
        request.query.sortOrder === SortOrder.NewToOld
          ? { order: { createdAt: "DESC" } as const }
          : request.query.sortOrder === SortOrder.OldToNew
            ? { order: { createdAt: "ASC" } as const }
            : undefined;

      const where = getOpportunityWhere(request.query.filter, request.query);
      const message = `Opportunities page:${request.query.page}.`;

      //  NGOs see only their own agent's opportunities
      if (request.authUser?.role === UserRole.AGENT) {
        const agentIds = await getCallerAgentIds(request.authUser.personId);

        // An agent with no shelter must see nothing, so return here rather than
        // skipping the filter, which would show everything.
        if (agentIds.length === 0) {
          return reply.status(200).send({
            message,
            data: [],
            count: 0,
          });
        }
        // NGOs are scoped to their own agents, so this overwrites any agent condition.
        where.agent = { id: In(agentIds) };
      }

      logger.debug(
        `GET /opportunities called. options: ${JSON.stringify({ where })}`,
      );

      const relations = [
        "deal.dealActivity.activity",
        "deal.dealLanguage.language",
        "deal.dealTimeslot.timeslot",
        "deal.dealDistrict.district",
        "agent",
        "agent.address.postcode",
        "accompanying",
        "onetimer",
        "opportunityVolunteer.volunteer.person",
      ];

      const opportunityRepository = fastify.db.opportunityRepository;

      // Sorting by start date (be#746) needs NULLS LAST regardless of
      // direction — opportunities with no onetimer (REGULAR type, or an
      // ACCOMPANYING/EVENTS one with no date set yet) always sort last, so
      // they don't crowd out real dates at the top of a "soonest first"
      // list. `find()`'s plain `order` option can't express that (Postgres
      // defaults DESC to NULLS FIRST), so this path uses the query builder,
      // with its own `leftJoinAndSelect` on `onetimer` (excluded from the
      // `relations` passed to `setFindOptions` to avoid joining it twice)
      // so the same alias both hydrates the entity and drives ORDER BY.
      // Pagination (skip/take) alongside the other one-to-many joins forces
      // TypeORM to wrap the query in a DISTINCT subquery, and any column
      // referenced in ORDER BY must be part of that subquery's projection —
      // `leftJoinAndSelect` (unlike plain `leftJoin`) satisfies that.
      const [opportunities, count] =
        request.query.sortBy === OpportunitySortField.START_DATE
          ? await opportunityRepository
              .createQueryBuilder("opportunity")
              .setFindOptions({
                where,
                relations: relations.filter((r) => r !== "onetimer"),
                skip,
                take,
              })
              .leftJoinAndSelect("opportunity.onetimer", "onetimerSort")
              .orderBy(
                "onetimerSort.date",
                request.query.sortOrder === SortOrder.OldToNew ? "ASC" : "DESC",
                "NULLS LAST",
              )
              .getManyAndCount()
          : await opportunityRepository.findAndCount({
              where,
              relations,
              skip,
              take,
              ...(order ? order : {}),
            });

      const { addCategoryToDeal, updates: dealUpdates } =
        getCategoryToDealHandler();

      const { addDistrictToOpportunity, updates: opportunityUpdates } =
        getDistrictToOpportunityHandler();

      const opportunitiesCategoryDistrict = await Promise.all(
        opportunities.map(async (opportunity) => {
          Object.assign(
            opportunity,
            await addDistrictToOpportunity(opportunity),
          );
          addCategoryToDeal(opportunity.deal);
          return opportunity;
        }),
      );

      if (dealUpdates.length > 0) {
        const dealRepository = fastify.db.dealRepository;
        await dealRepository.save(dealUpdates);
      }

      if (opportunityUpdates.length > 0) {
        await opportunityRepository.save(opportunityUpdates);
      }
      logger.debug(
        `Saving category updates: ${dealUpdates.length}, opportunity updates: ${opportunityUpdates.length}`,
      );

      // DTO (dtoOpportunityGetList) runs in the preSerialization hook after PII masking.
      return reply.status(200).send({
        message,
        data: opportunitiesCategoryDistrict,
        count,
      });
    },
  );

  // Create an opportunity with its satellites (deal + m2m, accompanying). Unlike
  // POST /opportunity/legacy, the owning agent and submitter are given in the
  // body / caller — no address/email guessing.
  fastify.post<{
    Body: OpportunityFormDataWithAgentSubmitter;
    Reply: ReplyData<{ id: number }>;
  }>(
    "/",
    {
      schema: {
        body: opportunityCreateBodySchema,
        response: opportunityCreateResponseSchema,
      },
    },
    async (request, reply) => {
      // GETs are open to any logged-in user (parent onRequest hook); creating an
      // opportunity is COORDINATOR/AGENT (ADMIN bypasses).
      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT &&
        role !== UserRole.ADMIN
      ) {
        throw new UnauthorizedError();
      }

      const body = request.body;

      const agentId = body.agent_id;
      if (!agentId) {
        throw new BadRequestError("agent_id is required.");
      }
      const agent = await fastify.db.agentRepository.findOne({
        where: { id: agentId },
        relations: ["address.postcode", "agentPerson"],
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      // This route derives the deal's postcode solely from the agent's
      // address (the form has no rac_plz fallback, unlike the legacy route).
      // deal.postcode_id is NOT NULL, so a missing postcode here would
      // otherwise reach the DB as an unhandled constraint violation.
      if (!agent.address?.postcode?.value) {
        throw new BadRequestError(
          `Agent (id:${agentId}) has no postcode on its address; set one before creating an opportunity for it.`,
        );
      }

      // An AGENT may only create opportunities for an agent they belong to;
      // COORDINATOR/ADMIN may create for any agent.
      if (role === UserRole.AGENT) {
        const personId = request.authUser?.personId;
        const membership = personId
          ? await fastify.db.agentPersonRepository.findOneBy({
              agentId,
              personId,
              status: AgentMembershipStatus.ACTIVE,
            })
          : null;
        if (!membership) {
          throw new UnauthorizedError(
            "Agents can only create opportunities for their own agent.",
          );
        }
      }

      // Only parseOpportunityLegacy/accompanyingParserOpportunity read the
      // legacy-shaped fields (title, accomp_*, etc.), which this form still
      // carries; the deal itself is resolved by numeric option id below
      // (dealParserOpportunityCreate), not through the legacy title lookup.
      const legacyBody = body as unknown as OpportunityLegacyFormData;
      const opportunity = await parseOpportunityLegacy(legacyBody);
      opportunity.deal = await dealParserOpportunityCreate(
        body,
        agent.address?.postcode?.value,
      );

      opportunity.accompanying = undefined;
      opportunity.onetimer = undefined;

      if (body.opportunity_type === OpportunityLegacyType.ACCOMPANYING) {
        opportunity.accompanying =
          await accompanyingParserOpportunity(legacyBody);
        opportunity.onetimer = new Onetimer({
          date: parseAccompDatetime(legacyBody.accomp_datetime),
        });
      } else if (opportunity.type === OpportunityType.EVENTS) {
        opportunity.onetimer = new Onetimer({
          date: new Date(legacyBody.onetime_date_time),
        });
      }

      opportunity.agentId = agentId;
      // Submitter: the explicit body value, else the authenticated caller.
      opportunity.submittedByPersonId =
        body.submitted_by_id ?? request.authUser?.personId;
      // Snapshot the contact at creation time (be#833): if this is left null,
      // getOpportunityContact falls back at *read* time to agent.representative,
      // which drifts every time the agent's contact list changes — so an
      // unrelated request years later can silently reattribute this
      // opportunity to whoever was just added. Freeze it now to whoever is
      // actually the submitter's agent membership, or the agent's current
      // representative if the submitter isn't one (e.g. a coordinator
      // creating on the agent's behalf).
      opportunity.contactPersonId = agent.agentPerson?.some(
        (ap) =>
          ap.personId === opportunity.submittedByPersonId &&
          ap.status === AgentMembershipStatus.ACTIVE,
      )
        ? opportunity.submittedByPersonId
        : agent.representative?.personId;

      // `agent` was fetched with relations/address.postcode already loaded
      // above; assign it here (not just agentId) so addDistrictToOpportunity
      // can resolve REGULAR/EVENTS districts from it at creation time.
      opportunity.agent = agent;
      const { addDistrictToOpportunity } = getDistrictToOpportunityHandler();
      Object.assign(opportunity, await addDistrictToOpportunity(opportunity));

      const id = await writeOpportunityLegacy(opportunity);

      fastify.notify.opsAlert(
        getOpportunityNotificationText(opportunity.title),
      );

      if (body.opportunity_type === OpportunityLegacyType.VOLUNTEERING) {
        (async () => {
          try {
            await sendNewOpportunityEmail(
              fastify,
              id,
              [
                "submittedByPerson",
                "submittedByPerson.users",
                "contactPerson",
                "contactPerson.users",
                "agent.agentPerson.person",
                "agent.agentPerson.person.users",
              ],
              (opp) => fastify.notify.emailNewRegular(opp),
              "emailNewRegular",
            );
          } catch (err) {
            logger.error(
              `emailNewRegular side-effect failed (opp ${id}): ${err}`,
            );
          }
        })();
      } else if (body.opportunity_type === OpportunityLegacyType.ACCOMPANYING) {
        (async () => {
          try {
            await sendNewOpportunityEmail(
              fastify,
              id,
              [
                "accompanying",
                "accompanying.postcode",
                "onetimer",
                "deal.dealLanguage.language",
                "submittedByPerson",
                "submittedByPerson.users",
                "contactPerson",
                "contactPerson.users",
                "agent.agentPerson.person",
                "agent.agentPerson.person.users",
                "district",
              ],
              async (opp) => {
                // The email's appointment-language field is the deal's own
                // requested languages, German-translated via field_translation
                // (be#856) — not the accompanying.languageToTranslate label
                // used elsewhere in the same email.
                await addTranslatedFields([opp], Lang.DE);
                await fastify.notify.emailNewAccompanying(opp);
              },
              "emailNewAccompanying",
            );
          } catch (err) {
            logger.error(
              `emailNewAccompanying side-effect failed (opp ${id}): ${err}`,
            );
          }
        })();
      }

      return reply.status(201).send({
        message: `Opportunity (${id}) created.`,
        data: { id },
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiOpportunityPatch;
    Reply: null;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerOpportunityPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      // COORDINATOR/ADMIN may edit the full patch surface, including
      // reassigning the opportunity to a different agent. An AGENT may edit
      // any field of an opportunity belonging to an agent they're a member of
      // (checked below, once the opportunity's agentId is known), except
      // reassigning it to a *different* agent — that stays coordinator-only,
      // matching the fe "Transfer" action (be#870).
      const role = request.authUser?.role;
      if (
        role !== UserRole.COORDINATOR &&
        role !== UserRole.AGENT &&
        role !== UserRole.ADMIN
      ) {
        throw new UnauthorizedError();
      }

      const id = request.params.id;

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOne({
        where: { id },
      });

      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }

      if (role === UserRole.AGENT) {
        const personId = request.authUser?.personId;
        const membership = personId
          ? await fastify.db.agentPersonRepository.findOneBy({
              agentId: opportunity.agentId,
              personId,
              status: AgentMembershipStatus.ACTIVE,
            })
          : null;
        if (!membership) {
          throw new UnauthorizedError(
            "Agents can only update opportunities belonging to their own agent.",
          );
        }

        // Only block an actual reassignment to a *different* agent — an
        // agent editing their own agent's name/address/district with no `id`
        // (or the same id) is a legitimate self-edit, not a relink (see
        // parser-opportunity-patch-data.ts's agentBody.id === undefined
        // branch, and be#871 review).
        const body = request.body as Record<string, unknown>;
        const agentBody = body.agent as { id?: number } | undefined;
        if (
          agentBody?.id !== undefined &&
          agentBody.id !== opportunity.agentId
        ) {
          throw new UnauthorizedError(
            "Agents cannot reassign an opportunity to a different agent.",
          );
        }
      }

      const dealId = opportunity.dealId;
      if (!dealId) {
        throw new Error(`Opportunity id:${id} is lacking a deal.`);
      }

      await assertValidMainCommunicationLanguages(
        request.body.languagesMain,
        fastify.db.languageRepository,
      );

      const {
        opportunity: opportunityObj,
        agent,
        accompanying,
        onetimerDate,
        languages,
        schedule,
        skills,
        activities,
      } = parseOpportunity(request.body);
      const agentLinkId = request.body.agent?.id;
      const contactLinkId = request.body.contact?.id;

      if (
        request.body.opportunity_type === OpportunityType.ACCOMPANYING &&
        !opportunity.accompanyingId
      ) {
        const details = request.body.accompanyingDetails;
        if (!details) {
          throw new BadRequestError(
            'Accompanying details are required when changing opportunity type to "accompanying".',
          );
        }
        const requiredFields = [
          "appointmentAddress",
          "appointmentDate",
          "appointmentTime",
          "refugeeName",
          "appointmentPostcode",
          "appointmentLanguage",
        ] as const;
        const missing = requiredFields.filter(
          (f) => !details[f as keyof typeof details],
        );
        if (missing.length > 0) {
          throw new BadRequestError(`Missing required accompanying fields`);
        }
      }

      const effectiveType = request.body.opportunity_type ?? opportunity.type;

      if (
        effectiveType === OpportunityType.EVENTS &&
        opportunity.type !== OpportunityType.EVENTS
      ) {
        if (!request.body.event?.date || !request.body.event?.time) {
          throw new BadRequestError(
            'Event date and time are required when changing opportunity type to "events".',
          );
        }
      }

      // Resolved and validated up front (rather than inside the
      // agentLinkId!==undefined block below) so the status-cascade transaction
      // below can target whichever agent will actually own this opportunity
      // once the request is applied — not the one it's being relinked away
      // from (be#862 review).
      if (agentLinkId !== undefined) {
        const linkedAgent = await fastify.db.agentRepository.findOne({
          where: { id: agentLinkId },
        });
        if (!linkedAgent) {
          throw new NotFoundError(`Agent (id:${agentLinkId}) not found.`);
        }
      }
      const effectiveAgentId = agentLinkId ?? opportunity.agentId;

      // Also validated up front, same reasoning as agentLinkId above:
      // effectiveAgentId already resolves to the *new* agent when this
      // request also relinks `agent.id`, so a payload that relinks both in
      // one go validates the contact against the new agent, not the old one.
      if (contactLinkId !== undefined) {
        const agentContactMembership =
          await fastify.db.agentPersonRepository.findOneBy({
            agentId: effectiveAgentId,
            personId: contactLinkId,
            status: AgentMembershipStatus.ACTIVE,
          });
        if (!agentContactMembership) {
          throw new NotFoundError(
            `Contact (personId:${contactLinkId}) has no active membership at this opportunity's agent.`,
          );
        }
      }

      // The opportunity patch, the be#862 search-status cascade, the agent
      // relink, and the contact relink all share one transaction — each used
      // to be a separate statement issued independently, so a failure partway
      // through could leave some of these applied and others lost (be#868
      // review).
      await dataSource.manager.transaction(async (manager) => {
        if (opportunityObj) {
          const success = await patchEntity(
            Opportunity,
            opportunityObj,
            opportunity.id,
            manager,
          );
          if (!success) {
            throw new Error("Patching opportunity failed.");
          }

          // An opportunity moving to a status that implies searching means
          // its agent is searching too (be#862) — cascaded here, atomically,
          // rather than as a second independent PATCH from the frontend.
          // agentId is nullable (e.g. orphaned legacy rows) — skip the
          // cascade rather than failing the whole status patch over it.
          if (
            effectiveAgentId &&
            opportunityObj.status &&
            impliesAgentSearching(opportunityObj.status)
          ) {
            await setAgentSearching(effectiveAgentId, manager);
          }
        }

        if (agentLinkId !== undefined) {
          // The opportunity's existing contact (if any) belongs to the *old*
          // agent and has no guaranteed relationship to the new one — clear
          // it rather than leave a stale cross-agent reference. If the
          // request also carries `contact.id`, the contactLinkId branch
          // below sets the real (validated-against-the-new-agent) value
          // right after this.
          const contactReset: Partial<Opportunity> =
            contactLinkId === undefined ? { contactPersonId: null } : {};
          const success = await patchEntity(
            Opportunity,
            { agentId: agentLinkId, ...contactReset } as Partial<Opportunity>,
            opportunity.id,
            manager,
          );
          if (!success) {
            throw new BadRequestError("Relinking opportunity agent failed.");
          }
        } else if (agent) {
          const success = await patchEntity(
            Agent,
            agent,
            opportunity.agentId,
            manager,
          );
          if (!success) {
            throw new Error(
              "Patching agent failed while patching opportunity.",
            );
          }
        }

        if (contactLinkId !== undefined) {
          // Evaluated after the agent relink above so a payload that resets
          // contactPersonId to null (contactReset, above) doesn't clobber the
          // real value being set here.
          const success = await patchEntity(
            Opportunity,
            { contactPersonId: contactLinkId } as Partial<Opportunity>,
            opportunity.id,
            manager,
          );
          if (!success) {
            throw new BadRequestError("Relinking opportunity contact failed.");
          }
        }
      });

      // Skipped when the opportunity is moving away from ACCOMPANYING —
      // otherwise `accompanyingDetails` sent alongside a type change would
      // write refugee PII into the Accompanying row moments before the
      // clearing block below deletes it (be#780 review).
      if (accompanying && effectiveType === OpportunityType.ACCOMPANYING) {
        const appointmentPostcodeValue =
          request.body.accompanyingDetails?.appointmentPostcode;
        if (appointmentPostcodeValue !== undefined) {
          const postcode = await getPostcode(appointmentPostcodeValue);
          if (!postcode) {
            throw new BadRequestError(
              `Postcode "${appointmentPostcodeValue}" not found.`,
            );
          }
          accompanying.postcodeId = postcode.id;
        }

        if (opportunity.accompanyingId) {
          const success = await patchEntity(
            Accompanying,
            accompanying,
            opportunity.accompanyingId,
          );
          if (!success) {
            throw new BadRequestError(
              "Patching accompanying failed while patching opportunity.",
            );
          }
          // Only create a new accompanying record if type is being changed to accompanying and no accompanying record exists yet.
        } else if (
          request.body.opportunity_type === OpportunityType.ACCOMPANYING
        ) {
          const newAccompanying = Object.assign(
            new Accompanying(),
            accompanying,
          );
          try {
            await fastify.db.accompanyingRepository.manager.transaction(
              async (manager) => {
                await manager.save(Accompanying, newAccompanying);
                await manager.update(Opportunity, opportunity.id, {
                  accompanyingId: newAccompanying.id,
                });
              },
            );
          } catch {
            throw new BadRequestError("Saving new accompanying failed");
          }
        }
      }

      // Single-occurrence start date/time, shared by ACCOMPANYING and EVENTS
      // via `onetimer` (see be#746) — owned 1:1 by the opportunity. Resolved
      // from whichever source matches the *resulting* type, so a payload that
      // (incorrectly) carries both `accompanyingDetails` and `event` — or
      // either alongside an unrelated type change — can't write a onetimer
      // that doesn't belong to this opportunity's new type.
      const resolvedOnetimerDate =
        effectiveType === OpportunityType.EVENTS
          ? request.body.event?.date && request.body.event?.time
            ? getDateObj(request.body.event.date, request.body.event.time)
            : undefined
          : effectiveType === OpportunityType.ACCOMPANYING
            ? onetimerDate
            : undefined;

      if (resolvedOnetimerDate) {
        await dataSource.manager.transaction(async (manager) => {
          const onetimer = await upsertOnetimer(
            opportunity.onetimerId,
            resolvedOnetimerDate,
            manager,
          );
          if (!opportunity.onetimerId) {
            await patchEntity(
              Opportunity,
              { onetimerId: onetimer.id } as Partial<Opportunity>,
              opportunity.id,
              manager,
            );
            opportunity.onetimerId = onetimer.id;
          }
        });
      }

      if (
        effectiveType === OpportunityType.REGULAR &&
        opportunity.type !== OpportunityType.REGULAR &&
        (opportunity.accompanyingId || opportunity.onetimerId)
      ) {
        await dataSource.manager.transaction((manager) =>
          clearStaleAccompanying(manager, opportunity, {
            alsoClearOnetimer: true,
          }),
        );
      }

      // This clearing was silently dropped when #816 refactored EVENTS off
      // the old blanked-out-Accompanying-row hack (be#780).
      if (
        effectiveType === OpportunityType.EVENTS &&
        opportunity.type !== OpportunityType.EVENTS &&
        opportunity.accompanyingId
      ) {
        await dataSource.manager.transaction((manager) =>
          clearStaleAccompanying(manager, opportunity, {
            alsoClearOnetimer: false,
          }),
        );
      }

      if (request.body.opportunity_type === OpportunityType.ACCOMPANYING) {
        await updateOptionList(dealId, DealTimeslot, []);
      }

      if (schedule) {
        const success = await updateOptionList(
          dealId,
          DealTimeslot,
          await Promise.all(
            schedule.map((scheduleObject) => {
              if (scheduleObject.id) {
                return { id: scheduleObject.id };
              }
              return getOrCreateTimeslot(scheduleObject);
            }),
          ),
        );
        if (!success) {
          throw new BadRequestError(
            `Availability for volunteer (id=${id}) not updated.`,
          );
        }
      }

      if (languages) {
        const success = await updateOptionList(dealId, DealLanguage, languages);
        if (!success) {
          throw new BadRequestError(
            `Languages for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      if (activities) {
        const success = await updateOptionList(
          dealId,
          DealActivity,
          activities,
        );
        if (!success) {
          throw new BadRequestError(
            `Activities for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      if (skills) {
        const success = await updateOptionList(dealId, DealSkill, skills);
        if (!success) {
          throw new BadRequestError(
            `Skills for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      return reply.status(204).send();
    },
  );

  // COORDINATOR-only, hard delete. OpportunityVolunteer (+ its ActivityLog),
  // Communication, and Appreciation rows all cascade via FK. Comment rows are
  // polymorphic (entityType/entityId, no real FK) so they're cleaned up
  // explicitly here; Deal and Accompanying are exclusively owned by one
  // opportunity each (minted fresh at creation), so they're deleted alongside
  // rather than left as permanent orphans.
  fastify.delete<{ Params: ParamsId; Reply: ReplyMessage }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        response: responseSchema(""),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOneBy({ id });

      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }

      const { dealId, accompanyingId, onetimerId } = opportunity;

      // OpportunityVolunteer rows cascade at the DB level, which bypasses
      // TypeORM's @AfterRemove hook (it never loads/removes those entities
      // via the entity manager) — so each linked volunteer's statusMatch
      // must be recomputed explicitly, or it's left stale indefinitely.
      const linkedVolunteerIds = (
        await fastify.db.opportunityVolunteerRepository.find({
          where: { opportunityId: id },
        })
      ).map((ov) => ov.volunteerId);

      await dataSource.manager.transaction(async (manager) => {
        await manager.delete(Comment, {
          entityType: EntityTableName.OPPORTUNITY,
          entityId: id,
        });
        await manager.delete(Opportunity, { id });
        if (dealId) {
          await manager.delete(Deal, { id: dealId });
        }
        if (accompanyingId) {
          await manager.delete(Accompanying, { id: accompanyingId });
        }
        if (onetimerId) {
          await manager.delete(Onetimer, { id: onetimerId });
        }
      });

      await Promise.all(
        linkedVolunteerIds.map((vId) => updateVolunteerMatching(vId)),
      );

      return reply.status(200).send({
        message: `Opportunity (id:${id}) deleted.`,
      });
    },
  );
}
