import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiOpportunityGet,
  ApiOpportunityGetList,
  ApiOpportunityPatch,
} from "need4deed-sdk";
import { FindOptionsWhere } from "typeorm";
import { BadRequestError, NotFoundError } from "../../../config";
import { defaultPageSize } from "../../../config/constants";
import ProfileActivity from "../../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../../data/entity/m2m/profile-language";
import ProfileSkill from "../../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../../data/entity/m2m/time-timeslot";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Comment from "../../../data/entity/volunteer/comment.entity";
import {
  dtoOpportunityGet,
  dtoOpportunityGetList,
  parseOpportunity,
} from "../../../services";
import {
  idParamSchema,
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
  addComments2Entity,
  getCategoryToProfileHandler,
  getDistrictToAgentHandler,
  getOrCreateTimeslot,
  getTranslationType,
  normalizeStringArrayInput,
  patchEntity,
  setTranslationType,
  updateOptionList,
} from "../../utils";
import opportunityLegacyRoutes from "./legacy.routes";
import opportunityOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";

export default async function opportunityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  await fastify.addHook("onRequest", fastify.authenticate());

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
        "deal.profile.profileLanguage.language",
        "deal.profile.profileActivity.activity",
        "deal.profile.profileSkill.skill",
        "deal.location.locationDistrict.district",
        "agent.agentPerson.person.address.postcode",
      ];

      const opportunityRepository = fastify.db.opportunityRepository;
      const opportunity = await opportunityRepository.findOne({
        where: { id },
        relations,
      });

      const opportunityComments: Opportunity & { comments: Comment[] } =
        await addComments2Entity(opportunity);

      const { addDistrictToAgent, updates } = getDistrictToAgentHandler(true);
      Object.assign(
        opportunityComments.agent,
        await addDistrictToAgent(opportunityComments.agent),
      );

      if (updates.length) {
        const agentRepository = fastify.db.agentRepository;
        await agentRepository.save(updates);
      }

      opportunityComments.accompanying.langCode = await setTranslationType(
        opportunityComments.accompanying.languageToTranslate,
      );

      const data = dtoOpportunityGet(opportunityComments);

      return reply.status(200).send({ message: `Opportunity id:${id}`, data });
    },
  );

  fastify.get<{
    Querystring: QuerystringOpportunityList;
    Reply: ReplyDataCount<ApiOpportunityGetList[]>;
  }>(
    "/",
    {
      schema: {
        querystring: opportunityListQuerySchema,
        response: responseSchema("ApiOpportunityGetList#", true),
      },
    },
    async (request, reply) => {
      const page = request.query.page || 1;
      const take = request.query.limit || defaultPageSize;
      const skip = (page - 1) * take;

      const where = {
        ...(request.query.type
          ? {
              type: normalizeStringArrayInput(request.query.type),
            }
          : {}),
        ...(request.query.status
          ? {
              status: normalizeStringArrayInput(request.query.status),
            }
          : {}),
      } as FindOptionsWhere<Opportunity>;

      fastify.log.debug(
        `GET /opportunities called. where: ${JSON.stringify(where)}`,
      );

      const relations = ["deal.profile.profileActivity.activity"];
      const opportunityRepository = fastify.db.opportunityRepository;
      const [opportunities, count] = await opportunityRepository.findAndCount({
        where,
        relations,
        skip,
        take,
      });

      const { addCategoryToProfile, updates } = getCategoryToProfileHandler();
      const opportunitiesCategory = opportunities.map((opportunity) => {
        Object.assign(
          opportunity.deal.profile,
          addCategoryToProfile(opportunity.deal.profile),
        );
        return opportunity;
      });

      if (updates.length > 0) {
        const profileRepository = fastify.db.profileRepository;
        await profileRepository.save(updates);
      }

      const data = opportunitiesCategory.map(dtoOpportunityGetList);

      return reply.status(200).send({
        message: `Opportunities page:${page}.`,
        data,
        count,
      });
    },
  );

  fastify.patch<{
    Params: ParamsId;
    Body: ApiOpportunityPatch;
    Reply: ReplyMessage;
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        body: { $ref: "ApiVolunteerOpportunityPatch#" },
        response: responseSchema(""),
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
      fastify.log.debug(
        `PATCH /opportunity/{id} ${JSON.stringify(parseOpportunity(request.body))}`,
      );

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

      if (agent) {
        const success = await patchEntity(Agent, agent, opportunity.agentId);
        if (!success) {
          throw new Error("Patching agent failed while patching opportunity.");
        }
      }

      if (accompanying) {
        const languageToTranslate = await getTranslationType(
          Number(accompanying.languageToTranslate),
        );
        const success = await patchEntity(
          Accompanying,
          Object.assign(accompanying, { languageToTranslate }),
          opportunity.accompanyingId,
        );
        if (!success) {
          throw new BadRequestError(
            "Patching accompanying failed while patching opportunity.",
          );
        }
      }

      if (schedule) {
        const success = await updateOptionList(
          dealId,
          TimeTimeslot,
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
        const success = await updateOptionList(
          dealId,
          ProfileLanguage,
          languages,
        );
        if (!success) {
          throw new BadRequestError(
            `Languages for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      if (activities) {
        const success = await updateOptionList(
          dealId,
          ProfileActivity,
          activities,
        );
        if (!success) {
          throw new BadRequestError(
            `Activities for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      if (skills) {
        const success = await updateOptionList(dealId, ProfileSkill, skills);
        if (!success) {
          throw new BadRequestError(
            `Skills for opportunity (deal_id:${dealId}) not updated.`,
          );
        }
      }

      return reply
        .status(200)
        .send({ message: "Opportunity has been patched." });
    },
  );
}
