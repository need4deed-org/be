import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerGet,
  ApiVolunteerGetList,
  EntityTableName,
  Lang,
  SortOrder,
  UserRole,
  VolunteerPatchBodyData,
} from "need4deed-sdk";
import { FindOptionsOrder, FindOptionsWhere, In } from "typeorm";
import { NotFoundError, UnauthorizedError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { updateOpportunityMatching } from "../../../data/utils";
import logger from "../../../logger";
import { volunteerListSerializer } from "../../../services";
import {
  idParamSchema,
  langQuerySchema,
  responseErrors,
  responseSchema,
  volunteerListQuerySchema,
} from "../../schema";
import {
  ParamsId,
  QuerystringVolunteerGetList,
  ReplyMessage,
  RoutePrefix,
  VolunteerListType,
} from "../../types";
import {
  buildEraseSummaryMessage,
  erasePersonPii,
  ErasePersonPiiSummary,
  fetchVolunteerById,
  getLanguageCode,
  getOrCreateTimeslot,
  getSkipTake,
  getVolunteerPatchData,
  getVolunteerWhere,
  patchEntity,
  patchOrReplaceAddress,
  updateOptionList,
} from "../../utils";
import {
  maskForCaller,
  resolveCallerMask,
} from "../../utils/pii/pre-serialization";
import volunteerAppreciationRoutes from "./appreciation.routes";
import volunteerAuditLogRoutes from "./audit-log.routes";
import volunteerCommunicationRoutes from "./communication.routes";
import volunteerDocRoutes from "./doc.routes";
import volunteerLegacyRoutes from "./legacy.routes";
import volunteerOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";
import volunteerRegisterRoutes from "./register.routes";
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
    "person.address.postcode",
  ];
  const getListRelations = (listType: VolunteerListType) =>
    listType === "table"
      ? listRelationsCommon
      : [...listRelationsCommon, ...listRelationsCardExtra];

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

  await fastify.register(volunteerAuditLogRoutes, {
    prefix: `/:id${RoutePrefix.ACTIVITY_LOG}`,
  });

  await fastify.register(volunteerOpportunityVolunteerRoutes, {
    prefix: `/:id${RoutePrefix.OPPORTUNITY_LINKED}`,
  });

  await fastify.register(volunteerLegacyRoutes, {
    prefix: `${RoutePrefix.LEGACY}`,
  });

  await fastify.register(volunteerRegisterRoutes, {
    prefix: RoutePrefix.REGISTER,
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

      const [idRows, count] = await volunteerRepository.findAndCount({
        where,
        select: { id: true },
        skip,
        take,
        order,
      });
      const ids = idRows.map((v) => v.id);

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
      const volunteer = await volunteerRepository.findOneByOrFail({ id });
      const dealId = volunteer.dealId;

      const role = request.authUser?.role;
      const isSelf =
        role === UserRole.VOLUNTEER &&
        request.authUser?.personId !== undefined &&
        request.authUser?.personId !== null &&
        request.authUser.personId === volunteer.personId;
      if (role !== UserRole.COORDINATOR && role !== UserRole.ADMIN && !isSelf) {
        throw new UnauthorizedError();
      }

      const {
        volunteerData: patchedVolunteerData,
        personData: patchedPersonData,
        addressData: patchedAddressData,
        postcodeData,
        languages,
        availability,
        activities,
        skills,
        locations,
      } = getVolunteerPatchData(request.body, ["dateReturn"]);

      const SELF_EDITABLE_VOLUNTEER_FIELDS = new Set<keyof Volunteer>([
        "infoAbout",
        "infoExperience",
        "statusCGC",
        "statusVaccination",
        "statusCGCApplicationDate",
        "statusCGCDate",
        "statusVaccinationDate",
        "preferredCommunicationType",
      ]);
      let volunteerData = patchedVolunteerData;
      if (isSelf && patchedVolunteerData) {
        const filtered = Object.fromEntries(
          Object.entries(patchedVolunteerData).filter(([key]) =>
            SELF_EDITABLE_VOLUNTEER_FIELDS.has(key as keyof Volunteer),
          ),
        ) as typeof patchedVolunteerData;
        volunteerData = Object.keys(filtered).length ? filtered : undefined;
      }

      let personData = patchedPersonData;
      let addressData = patchedAddressData;
      if (isSelf) {
        if (personData) {
          personData = { ...personData, id: volunteer.personId };
        }
        if (addressData) {
          const ownPerson = await fastify.db.personRepository.findOneBy({
            id: volunteer.personId,
          });
          addressData = ownPerson?.addressId
            ? { ...addressData, id: ownPerson.addressId }
            : undefined;
        }
      }

      const auditLogEntries: Partial<VolunteerAuditLog>[] = [];
      if (
        volunteerData?.statusEngagement !== undefined &&
        volunteerData.statusEngagement !== volunteer.statusEngagement
      ) {
        auditLogEntries.push({
          type: "availability_changed",
          detail: `Status changed from ${volunteer.statusEngagement} to ${volunteerData.statusEngagement}.`,
        });
      }
      let hasContactChange = false;
      if ((personData && personData.id) || (addressData && addressData.id)) {
        const prevPerson = await fastify.db.personRepository.findOne({
          where: { id: (personData?.id ?? volunteer.personId) as number },
          relations: ["address"],
        });
        if (personData) {
          hasContactChange ||= Object.entries(personData).some(
            ([key, value]) =>
              key !== "id" && prevPerson?.[key as keyof Person] !== value,
          );
        }
        if (addressData) {
          hasContactChange ||= Object.entries(addressData).some(
            ([key, value]) =>
              key !== "id" &&
              prevPerson?.address?.[key as keyof Address] !== value,
          );
        }
      }
      if (hasContactChange) {
        auditLogEntries.push({
          type: "contact_details_changed",
          detail: "Contact details updated.",
        });
      }

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
          const success = await patchOrReplaceAddress(
            personData?.id ?? volunteer.personId,
            addressData as Partial<Address> & { id: number },
            postcodeData,
          );
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

      if (auditLogEntries.length) {
        const occurredAt = new Date();
        await fastify.db.volunteerAuditLogRepository.save(
          auditLogEntries.map(
            (entry) =>
              new VolunteerAuditLog({
                ...entry,
                volunteerId: id,
                actorUserId: request.authUser?.id,
                occurredAt,
              }),
          ),
        );
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
      const volunteerRepository = fastify.db.volunteerRepository;
      const volunteer = await volunteerRepository.findOneBy({ id });

      if (!volunteer) {
        throw new NotFoundError(`Volunteer (id:${id}) not found.`);
      }

      const { dealId, personId } = volunteer;

      const linkedOpportunityIds = (
        await fastify.db.opportunityVolunteerRepository.find({
          where: { volunteerId: id },
        })
      ).map((ov) => ov.opportunityId);

      let eraseSummary: ErasePersonPiiSummary | undefined;

      await dataSource.manager.transaction(async (manager) => {
        await manager.delete(Comment, {
          entityType: EntityTableName.VOLUNTEER,
          entityId: id,
        });
        await manager.delete(Volunteer, { id });
        if (dealId) {
          await manager.delete(Deal, { id: dealId });
        }
        if (personId) {
          eraseSummary = await erasePersonPii(manager, personId);
        }
      });

      await Promise.all(
        linkedOpportunityIds.map((oId) => updateOpportunityMatching(oId)),
      );

      const message = buildEraseSummaryMessage(
        `Volunteer (id:${id})`,
        eraseSummary,
      );

      return reply.status(200).send({ message });
    },
  );
}
