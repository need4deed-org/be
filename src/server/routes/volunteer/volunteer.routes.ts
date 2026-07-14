import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerGet,
  ApiVolunteerGetList,
  Id,
  Lang,
  SortOrder,
  UserRole,
  VolunteerFormData,
  VolunteerPatchBodyData,
} from "need4deed-sdk";
import { FindOptionsOrder, FindOptionsWhere, In } from "typeorm";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import logger from "../../../logger";
import {
  leadFromParser,
  parseFormData,
  volunteerFormParser,
  volunteerListSerializer,
} from "../../../services";
import {
  idParamSchema,
  langQuerySchema,
  responseErrors,
  responseSchema,
  volunteerListQuerySchema,
} from "../../schema";
import {
  QuerystringVolunteerGetList,
  RoutePrefix,
  VolunteerListType,
} from "../../types";
import {
  fetchVolunteerById,
  getLanguageCode,
  getOrCreateTimeslot,
  getSkipTake,
  getVolunteerPatchData,
  getVolunteerWhere,
  patchAddress,
  patchEntity,
  updateLeads,
  updateOptionList,
  writeVolunteerLegacy,
} from "../../utils";
import {
  maskForCaller,
  resolveCallerMask,
} from "../../utils/pii/pre-serialization";
import volunteerAppreciationRoutes from "./appreciation.routes";
import volunteerCommunicationRoutes from "./communication.routes";
import volunteerDocRoutes from "./doc.routes";
import volunteerLegacyRoutes from "./legacy.routes";
import volunteerOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";
import volunteerOpportunityRoutes from "./volunteer-opportunity.routes";

export default async function volunteerRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
) {
  const relations = [
    "person",
    "person.address.postcode",
    "deal",
    "deal.postcode",
    "deal.dealActivity.activity",
    "deal.dealSkill.skill",
    "deal.dealLanguage.language",
    "deal.dealTimeslot.timeslot",
    "deal.dealDistrict.district",
  ];

  // Relations the list view actually serializes (volunteerListSerializer):
  // neither person.address.postcode nor deal.postcode are used, so they are
  // omitted. The table view renders only languages + locations; the card view
  // additionally renders activities, skills and availability.
  const listRelationsCommon = [
    "person",
    "deal",
    "deal.dealLanguage.language",
    "deal.dealDistrict.district",
  ];
  const listRelationsCardExtra = [
    "deal.dealActivity.activity",
    "deal.dealSkill.skill",
    "deal.dealTimeslot.timeslot",
  ];
  const getListRelations = (listType: VolunteerListType) =>
    listType === "table"
      ? listRelationsCommon
      : [...listRelationsCommon, ...listRelationsCardExtra];

  // GETs open to any logged-in user (PII masked per role); writes stay
  // COORDINATOR-only (re-gated per-route).
  fastify.addHook("onRequest", fastify.authenticate());

  await fastify.register(volunteerOpportunityRoutes, {
    prefix: RoutePrefix.OPPORTUNITY,
  });

  await fastify.register(volunteerDocRoutes, {
    prefix: `/:id${RoutePrefix.DOC}`,
  });

  await fastify.register(volunteerCommunicationRoutes, {
    prefix: `/:id${RoutePrefix.COMMUNICATION}`,
  });

  await fastify.register(volunteerAppreciationRoutes, {
    prefix: `/:id${RoutePrefix.APPRECIATION}`,
  });

  await fastify.register(volunteerOpportunityVolunteerRoutes, {
    prefix: `/:id${RoutePrefix.OPPORTUNITY_LINKED}`,
  });

  await fastify.register(volunteerLegacyRoutes, {
    prefix: `${RoutePrefix.LEGACY}`,
  });

  fastify.get<{
    Params: { id: string };
    Querystring: {
      language: string;
    };
    Reply: {
      message: string;
      data?: ApiVolunteerGet;
    };
  }>(
    "/:id",
    {
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        response: responseSchema("volunteer-api-id#"),
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        logger.error(`${id} is not a valid id.`);
        return reply.status(400).send({ message: `${id} is not a valid id.` });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const data = await fetchVolunteerById(
          id,
          isoCode,
          relations,
          await resolveCallerMask(request),
        );
        if (!data) {
          logger.error(`Failed fetching volunteer (id=${id}).`);
          throw new Error(`Volunteer (id=${id}) not found after patch.`);
        }
        return reply.status(200).send({
          message: `Volunteer (id=${id}).`,
          data,
        });
      } catch (error) {
        logger.error(`Error fetching volunteer id=${id}: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.get<{
    Querystring: QuerystringVolunteerGetList;
    Reply: {
      message: string;
      count?: number;
      data?: Array<ApiVolunteerGetList>;
    };
  }>(
    "/",
    {
      schema: {
        querystring: volunteerListQuerySchema,
        response: responseSchema("volunteer-api#", true),
      },
    },
    async (request, reply) => {
      function filterWorkaround(query: QuerystringVolunteerGetList) {
        if (query.filter) {
          const engagement = [query.filter.engagement]
            .flat()
            .filter(Boolean)
            .map((e) => `vol-${e}`);
          const match = [query.filter.match]
            .flat()
            .filter(Boolean)
            .map((m) => `vol-${m}`);
          Object.assign(query.filter, {
            engagement: engagement.length ? engagement : undefined,
            match: match.length ? match : undefined,
          });
        }
        return query;
      }

      const { page, limit, sortOrder, filter, listType } = filterWorkaround(
        request.query,
      );
      const [skip, take] = getSkipTake({ page, limit });

      const where = getVolunteerWhere(filter) as FindOptionsWhere<Volunteer>;
      const order: FindOptionsOrder<Volunteer> = {
        id: sortOrder === SortOrder.OldToNew ? "ASC" : "DESC",
      };

      const volunteerRepository = fastify.db.volunteerRepository;

      // Step 1: page the volunteer ids + total count without hydrating any
      // collection. TypeORM auto-joins only the relations the filter touches,
      // so the COUNT no longer runs over a 5-way cartesian join.
      const [idRows, count] = await volunteerRepository.findAndCount({
        where,
        select: { id: true },
        skip,
        take,
        order,
      });
      const ids = idRows.map((v) => v.id);

      // Step 2: load just this page's entities, fetching collections via the
      // "query" strategy (one query per relation) to avoid a cartesian blow-up.
      const volunteers = ids.length
        ? await volunteerRepository.find({
            where: { id: In(ids) },
            relations: getListRelations(listType ?? "card"),
            relationLoadStrategy: "query",
            order,
          })
        : [];

      await maskForCaller(request, volunteers);
      const data = volunteers.map(volunteerListSerializer).filter(Boolean);

      reply.status(200).send({
        message: `Volunteers page ${request.query.page}`,
        count,
        data,
      });
    },
  );

  fastify.patch<{
    Params: { id: string };
    Querystring: {
      language: string;
    };
    Body: VolunteerPatchBodyData;
    Reply: {
      message: string;
      data?: ApiVolunteerGet;
    };
  }>(
    "/:id",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        params: idParamSchema,
        querystring: langQuerySchema,
        body: { $ref: "volunteer-api-id-part#" },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: { $ref: "volunteer-api-id#" },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply
          .status(400)
          .send({ message: `${request.params.id}: is not a valid id.` });
      }

      const volunteerRepository = fastify.db.volunteerRepository;
      const dealId = (await volunteerRepository.findOneByOrFail({ id })).dealId;

      const {
        volunteerData,
        personData,
        addressData,
        postcodeData,
        languages,
        availability,
        activities,
        skills,
        locations,
      } = getVolunteerPatchData(request.body, ["dateReturn"]);

      try {
        if (volunteerData) {
          const success = await patchEntity(Volunteer, volunteerData, id);
          if (!success) {
            return reply.status(400).send({
              message: `Volunteer (id=${id}) not updated.`,
            });
          }
        }

        if (personData && personData.id) {
          const success = await patchEntity(Person, personData);
          if (!success) {
            return reply.status(400).send({
              message: `Person (id=${personData.id}) not updated.`,
            });
          }
        }

        if (addressData && addressData.id) {
          const success = await patchAddress(addressData, postcodeData);
          if (!success) {
            return reply.status(400).send({
              message: `Address (id=${addressData.id}) not updated.`,
            });
          }
        }

        if (languages) {
          const success = await updateOptionList(
            dealId,
            DealLanguage,
            languages,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Languages for volunteer (deal_id:${dealId}) not updated.`,
            });
          }
        }

        if (availability) {
          const success = await updateOptionList(
            dealId,
            DealTimeslot,
            await Promise.all(
              availability.map((availabilityObject) => {
                if (availabilityObject.id) {
                  return { id: availabilityObject.id };
                }
                return getOrCreateTimeslot(availabilityObject);
              }),
            ),
          );
          if (!success) {
            return reply.status(400).send({
              message: `Availability for volunteer (deal_id:${dealId}) not updated.`,
            });
          }
        }

        if (activities) {
          const success = await updateOptionList(
            dealId,
            DealActivity,
            activities,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Activities for volunteer (deal_id:${dealId}) not updated.`,
            });
          }
        }

        if (skills) {
          const success = await updateOptionList(dealId, DealSkill, skills);
          if (!success) {
            return reply.status(400).send({
              message: `Skills for volunteer (deal_id:${dealId}) not updated.`,
            });
          }
        }

        if (locations) {
          const success = await updateOptionList(
            dealId,
            DealDistrict,
            locations,
          );
          if (!success) {
            return reply.status(400).send({
              message: `Locations for volunteer (deal_id:${dealId}) not updated.`,
            });
          }
        }
      } catch (error) {
        logger.error(`Error patching volunteer data (id=${dealId}): ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }

      const isoCode = getLanguageCode(request.query.language) || Lang.DE;

      try {
        const data = await fetchVolunteerById(
          id,
          isoCode,
          relations,
          await resolveCallerMask(request),
        );
        if (!data) {
          logger.error(`Failed fetching volunteer (id=${id}) after patch.`);
          throw new Error(`Volunteer (id=${id}) not found after patch.`);
        }
        return reply.status(200).send({
          message: `Volunteer (id=${id}) patched.`,
          data,
        });
      } catch (error) {
        logger.error(`Error fetching volunteer (id=${id}): ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );

  fastify.post<{
    Querystring: {
      language: string;
    };
    Body: VolunteerFormData;
    Reply: {
      message: string;
      data?: { id: Id };
    };
  }>(
    "/",
    {
      onRequest: fastify.authenticate({ role: UserRole.COORDINATOR }),
      schema: {
        querystring: langQuerySchema,
        body: { $ref: "volunteer-form-data" },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
              data: {
                type: "object",
                properties: { id: { type: ["string", "number"] } },
                required: ["id"],
              },
            },
            required: ["message", "data"],
          },
          ...responseErrors,
        },
      },
    },
    async (request, reply) => {
      logger.debug(`endpoint:POST: ${JSON.stringify(request.body)}`);
      try {
        const volunteer = await parseFormData(
          request.body,
          volunteerFormParser,
        );

        const leads = await parseFormData(
          request.body.leadFrom,
          leadFromParser,
        );

        const id = await writeVolunteerLegacy(volunteer);
        if (id) {
          await updateLeads(leads);
        }

        return reply.status(201).send({
          message: "Volunteer stored.",
          data: { id },
        });
      } catch (error) {
        logger.error(`Error writing volunteer: ${error}`);
        return reply.status(500).send({ message: "Internal server error." });
      }
    },
  );
}
