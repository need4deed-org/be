import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOpportunityGet,
  ApiOpportunityPatch,
  CommunicationType,
  OpportunityFormDataWithAgentSubmitter,
  OpportunityLegacyFormData,
  OpportunityLegacyType,
  OpportunityType,
  SortOrder,
  UserRole,
} from "need4deed-sdk";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import Comment from "../../../data/entity/comment.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import { getDistrictFromPostcode } from "../../../data/utils/get-district";
import logger from "../../../logger";
import {
  accompanyingParserOpportunity,
  dtoOpportunityGet,
  dtoOpportunityGetList,
  parseOpportunity,
  parseOpportunityLegacy,
} from "../../../services";
import { dealParserOpportunity } from "../../../services/dto/parser-deal-opportunity";
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
  RoutePrefix,
} from "../../types";
import {
  addComments2Entity,
  getCategoryToDealHandler,
  getDistrictToAgentHandler,
  getDistrictToOpportunityHandler,
  getOpportunityNotificationText,
  getOpportunityOrphanageAgent,
  getOpportunityWhere,
  getOrCreateEventTimeslot,
  getOrCreateTimeslot,
  getPostcode,
  getSkipTake,
  patchEntity,
  updateOptionList,
  writeOpportunityLegacy,
} from "../../utils";
import { logEmailCommunication } from "../../utils/data/log-email-communication";
import {
  makePiiSerialization,
  maskForCaller,
} from "../../utils/pii/pre-serialization";
import opportunityLegacyRoutes from "./legacy.routes";
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

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  // GETs open to any logged-in user (PII masked per role); writes stay
  // COORDINATOR-only (re-gated per-route).
  fastify.addHook("onRequest", fastify.authenticate());

  await fastify.register(opportunityLegacyRoutes, {
    prefix: RoutePrefix.LEGACY,
  });

  await fastify.register(opportunityOpportunityVolunteerRoutes, {
    prefix: `:id${RoutePrefix.VOLUNTEER_LINKED}`,
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
        "deal.dealLanguage.language",
        "deal.dealActivity.activity",
        "deal.dealSkill.skill",
        "deal.dealDistrict.district",
        "deal.dealTimeslot.timeslot",
        "agent.agentPerson.person.address.postcode",
        "agent.district",
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

      if (districtUpdates.length) {
        const agentRepository = fastify.db.agentRepository;
        await agentRepository.save(districtUpdates);
      }

      const { addDistrictToOpportunity, updates: opportunityUpdates } =
        getDistrictToOpportunityHandler();
      Object.assign(
        opportunityComments,
        await addDistrictToOpportunity(opportunityComments),
      );

      if (opportunityUpdates.length) {
        const opportunityRepository = fastify.db.opportunityRepository;
        await opportunityRepository.save(opportunityUpdates);
      }

      const accompanyingDistrict = opportunityComments.accompanying?.postcode
        ? await getDistrictFromPostcode(
            opportunityComments.accompanying.postcode,
          )
        : null;

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

      const where = getOpportunityWhere(request.query.filter);

      logger.debug(
        `GET /opportunities called. options: ${JSON.stringify({ where })}`,
      );

      const relations = [
        "deal.dealActivity.activity",
        "deal.dealLanguage.language",
        "deal.dealTimeslot.timeslot",
        "deal.dealDistrict.district",
        "agent",
        "accompanying",
        "opportunityVolunteer.volunteer.person",
      ];

      const opportunityRepository = fastify.db.opportunityRepository;
      const [opportunities, count] = await opportunityRepository.findAndCount({
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
        message: `Opportunities page:${request.query.page}.`,
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
        relations: ["address.postcode"],
      });
      if (!agent) {
        throw new NotFoundError(`Agent (id:${agentId}) not found.`);
      }

      // An AGENT may only create opportunities for an agent they belong to;
      // COORDINATOR/ADMIN may create for any agent.
      if (role === UserRole.AGENT) {
        const personId =
          request.authUser?.personId || request.body.submitted_by_id;
        const membership = personId
          ? await fastify.db.agentPersonRepository.findOneBy({
              agentId,
              personId,
            })
          : null;
        if (!membership) {
          throw new UnauthorizedError(
            "Agents can only create opportunities for their own agent.",
          );
        }
      }

      // The form is legacy-shaped minus the rac_* fields; the legacy parsers
      // accept it. deal.postcode comes from the owning agent's address.
      const legacyBody = body as OpportunityLegacyFormData;
      const opportunity = await parseOpportunityLegacy(legacyBody);
      opportunity.deal = await dealParserOpportunity(
        legacyBody,
        agent.address?.postcode?.value,
      );

      opportunity.accompanying = undefined;

      if (body.opportunity_type === OpportunityLegacyType.ACCOMPANYING) {
        opportunity.accompanying =
          await accompanyingParserOpportunity(legacyBody);
      } else if (opportunity.type === OpportunityType.EVENTS) {
        opportunity.accompanying = new Accompanying({
          date: new Date(legacyBody.onetime_date_time),
          address: "",
          name: "",
        });
      }

      opportunity.agentId = agentId;
      // Submitter: the explicit body value, else the authenticated caller.
      opportunity.submittedByPersonId =
        body.submitted_by_id ?? request.authUser?.personId;

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
              ["contactPerson", "contactPerson.users"],
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
                "contactPerson",
                "contactPerson.users",
                "district",
              ],
              (opp) => fastify.notify.emailNewAccompanying(opp),
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
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerOpportunityPatch#" },
        response: responseSchema({ statusCode: 204 }),
      },
    },
    async (request, reply) => {
      const id = request.params.id;

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOne({
        where: { id },
      });

      if (!opportunity) {
        throw new NotFoundError(`Opportunity (id:${id}) not found.`);
      }

      const dealId = opportunity.dealId;
      if (!dealId) {
        throw new Error(`Opportunity id:${id} is lacking a deal.`);
      }

      const {
        opportunity: opportunityObj,
        contact,
        agent,
        accompanying,
        languages,
        schedule,
        skills,
        activities,
      } = parseOpportunity(request.body);
      const agentLinkId = request.body.agent?.id;
      logger.debug(
        `PATCH /opportunity/{id} ${JSON.stringify(parseOpportunity(request.body))}`,
      );

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

      if (opportunityObj) {
        const success = await patchEntity(
          Opportunity,
          opportunityObj,
          opportunity.id,
        );
        if (!success) {
          throw new Error("Patching opportunity failed.");
        }
      }

      if (contact) {
        const success = await patchEntity(Person, contact);
        if (!success) {
          throw new Error(
            "Patching contact failed while patching opportunity.",
          );
        }
      }

      if (agentLinkId !== undefined) {
        const linkedAgent = await fastify.db.agentRepository.findOne({
          where: { id: agentLinkId },
        });
        if (!linkedAgent) {
          throw new NotFoundError(`Agent (id:${agentLinkId}) not found.`);
        }
        const success = await patchEntity(
          Opportunity,
          { agentId: agentLinkId } as Partial<Opportunity>,
          opportunity.id,
        );
        if (!success) {
          throw new BadRequestError("Relinking opportunity agent failed.");
        }
      } else if (agent) {
        const success = await patchEntity(Agent, agent, opportunity.agentId);
        if (!success) {
          throw new Error("Patching agent failed while patching opportunity.");
        }
      }

      if (accompanying) {
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

      // If the opportunity is being changed to an event or already an event, create or update the accompanying record with the event date and time, and create or update the timeslot for the event.
      if (
        effectiveType === OpportunityType.EVENTS &&
        request.body.event?.date &&
        request.body.event?.time
      ) {
        const eventDate = getDateObj(
          request.body.event.date,
          request.body.event.time,
        );

        if (opportunity.accompanyingId) {
          await patchEntity(
            Accompanying,
            {
              date: eventDate,
              address: "",
              name: "",
              phone: null,
              email: null,
              languageToTranslate: null,
              postcodeId: null,
            },
            opportunity.accompanyingId,
          );
        } else {
          const newAccompanying = new Accompanying({
            date: eventDate,
            address: "",
            name: "",
          });
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
            throw new BadRequestError(
              "Saving new accompanying for event failed",
            );
          }
        }

        const timeslot = await getOrCreateEventTimeslot(eventDate);
        await updateOptionList(dealId, DealTimeslot, [{ id: timeslot.id }]);
      }

      if (
        effectiveType === OpportunityType.REGULAR &&
        opportunity.type !== OpportunityType.REGULAR &&
        opportunity.accompanyingId
      ) {
        await fastify.db.accompanyingRepository.manager.transaction(
          async (manager) => {
            await manager.update(Opportunity, opportunity.id, {
              accompanyingId: null,
            });
            await manager.delete(Accompanying, opportunity.accompanyingId);
          },
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
}
