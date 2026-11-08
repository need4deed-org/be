import { FastifyInstance, FastifyPluginOptions } from "fastify";
import {
  ApiVolunteerGet,
  ApiVolunteerGetList,
  EntityTableName,
  Lang,
  QueryParamsKeys,
  SortOrder,
  UserRole,
  VolunteerPatchBodyData,
} from "need4deed-sdk";
import { FindOptionsOrder, In } from "typeorm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../config";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { getPostcode, updateOpportunityMatching } from "../../../data/utils";
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
} from "../../types";
import {
  alertOnChange,
  andIntoWhere,
  assertCommuteFilterAccess,
  buildEraseSummaryMessage,
  createAddress,
  erasePersonPii,
  ErasePersonPiiSummary,
  fetchVolunteerById,
  findAvailabilityDealIds,
  getEntitySnapshot,
  getLanguageCode,
  getOrCreateTimeslot,
  getSkipTake,
  getVolunteerPatchData,
  getVolunteerSelfEditNotificationText,
  getVolunteerWhere,
  isStaffRole,
  normalizeVolunteerStatusFilter,
  patchEntity,
  patchOrReplaceAddress,
  resolveCommuteFilter,
  updateOptionList,
  volunteerCommuteIdWhere,
} from "../../utils";
import { volunteerListRelations } from "../../utils/data/volunteer-list";
import { maskPii } from "../../utils/pii/mask";
import {
  resetCallerMask,
  resolveCallerMask,
} from "../../utils/pii/pre-serialization";
import {
  assertVolunteerVisible,
  resolveVolunteerVisibility,
} from "../../utils/pii/volunteer-visibility";
import { volunteerDistrictRoutes } from "../district-map.routes";
import volunteerAppreciationRoutes from "./appreciation.routes";
import volunteerAuditLogRoutes from "./audit-log.routes";
import volunteerCommunicationRoutes from "./communication.routes";
import volunteerDocRoutes from "./doc.routes";
import volunteerLegacyRoutes from "./legacy.routes";
import volunteerOpportunityVolunteerRoutes from "./opportunity-volunteer.routes";
import volunteerRegisterRoutes from "./register.routes";
import volunteerOpportunityRoutes from "./volunteer-opportunity.routes";
import volunteerRecommendedOpportunityRoutes from "./volunteer-recommended-opportunity.routes";

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

  fastify.addHook("onRequest", fastify.authenticate());
  fastify.addHook("preHandler", async (request) => {
    const { id } = (request.params ?? {}) as { id?: string };
    if (id !== undefined && Number.isInteger(Number(id))) {
      await assertVolunteerVisible(request, Number(id));
    }
  });

  fastify.register(volunteerDistrictRoutes);

  await fastify.register(volunteerOpportunityRoutes, {
    prefix: RoutePrefix.OPPORTUNITY,
  });

  await fastify.register(volunteerDocRoutes, {
    prefix: `/:id${RoutePrefix.DOC}`,
  });

  await fastify.register(volunteerRecommendedOpportunityRoutes, {
    prefix: `/:id${RoutePrefix.RECOMMENDED_OPPORTUNITIES}`,
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

      const data = await fetchVolunteerById(
        id,
        isoCode,
        relations,
        await resolveCallerMask(request),
      );
      if (!data) {
        throw new NotFoundError(`Volunteer (id:${id}) not found.`);
      }
      return reply.status(200).send({
        message: `Volunteer (id=${id}).`,
        data,
      });
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
      const { page, limit, sortOrder, listType } = request.query;
      const filter = request.query.filter
        ? {
            ...request.query.filter,
            engagement: normalizeVolunteerStatusFilter(
              request.query.filter.engagement,
            ),
            match: normalizeVolunteerStatusFilter(request.query.filter.match),
          }
        : undefined;
      assertCommuteFilterAccess(filter, request.authUser?.role);
      const [skip, take] = getSkipTake({ page, limit });

      const [visibility, availabilityDealIds, commute] = await Promise.all([
        resolveVolunteerVisibility(request),
        findAvailabilityDealIds(filter?.availability),
        resolveCommuteFilter(filter, QueryParamsKeys.COMMUTE_OPPORTUNITY_ID),
      ]);
      const where = getVolunteerWhere(filter, visibility, availabilityDealIds);
      if (commute) {
        andIntoWhere(where, "id", volunteerCommuteIdWhere(commute));
      }
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
            relations: volunteerListRelations(listType ?? "card"),
            relationLoadStrategy: "query",
            order,
          })
        : [];

      if (visibility) {
        maskPii(volunteers, visibility);
      }
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
      if (!isStaffRole(role) && !isSelf) {
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

      const { ownerAgentId } = request.body;
      let ownerChange: Partial<VolunteerAuditLog> | undefined;
      if (
        ownerAgentId !== undefined &&
        ownerAgentId !== volunteer.ownerAgentId
      ) {
        if (role !== UserRole.ADMIN) {
          throw new UnauthorizedError();
        }
        const owners = await fastify.db.agentRepository.find({
          select: { id: true, title: true },
          where: {
            id: In(
              [volunteer.ownerAgentId, ownerAgentId].filter(
                (agentId) => agentId !== null,
              ),
            ),
          },
        });
        if (
          ownerAgentId !== null &&
          !owners.some((agent) => agent.id === ownerAgentId)
        ) {
          throw new BadRequestError(`Agent (id:${ownerAgentId}) not found.`);
        }
        const ownerLabel = (agentId: number | null) => {
          const agent = owners.find((owner) => owner.id === agentId);
          return agent ? `${agent.title} (id:${agent.id})` : "need4deed";
        };
        volunteerData = { ...volunteerData, ownerAgentId };
        ownerChange = {
          type: "owner_changed",
          detail: `Owner changed from ${ownerLabel(volunteer.ownerAgentId)} to ${ownerLabel(ownerAgentId)}.`,
        };
      }

      const personData = patchedPersonData
        ? { ...patchedPersonData, id: volunteer.personId }
        : undefined;
      const ownPerson = await fastify.db.personRepository.findOne({
        where: { id: volunteer.personId },
        relations: ["address"],
      });

      const addressFields = Object.fromEntries(
        Object.entries(patchedAddressData ?? {}).filter(
          ([key, value]) => key !== "id" && value !== "",
        ),
      ) as Partial<Address>;
      const sendsPostcode = Boolean(postcodeData?.id || postcodeData?.value);
      let addressData: Partial<Address> | undefined;
      let resolvedPostcode: Partial<Postcode> | undefined;
      if (Object.keys(addressFields).length || sendsPostcode) {
        if (sendsPostcode) {
          let postcode: Postcode | null;
          if (postcodeData?.id) {
            const id = Number(postcodeData.id);
            postcode = Number.isInteger(id)
              ? await fastify.db.postcodeRepository.findOneBy({ id })
              : null;
            if (!postcode) {
              throw new BadRequestError("Address not saved: unknown postcode.");
            }
          } else {
            postcode = await getPostcode(postcodeData!.value!, {
              createOnlyGerman: true,
            });
            if (!postcode) {
              throw new BadRequestError("Address not saved: invalid postcode.");
            }
          }
          resolvedPostcode = { id: postcode.id };
        }
        if (!ownPerson?.addressId && !resolvedPostcode) {
          throw new BadRequestError(
            "Address not saved: a postcode is required.",
          );
        }
        addressData = {
          ...addressFields,
          id: ownPerson?.addressId ?? undefined,
        };
      }

      const snapshotRelations = [
        "person.address",
        "deal.dealLanguage",
        "deal.dealTimeslot",
        "deal.dealActivity",
        "deal.dealSkill",
        "deal.dealDistrict",
      ];
      const takeSnapshot = () =>
        getEntitySnapshot(Volunteer, id, snapshotRelations);
      const snapshotBefore = isSelf ? await takeSnapshot() : null;

      const auditLogEntries: Partial<VolunteerAuditLog>[] = ownerChange
        ? [ownerChange]
        : [];
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
      if (personData) {
        hasContactChange ||= Object.entries(personData).some(
          ([key, value]) =>
            key !== "id" && ownPerson?.[key as keyof Person] !== value,
        );
      }
      if (addressData) {
        hasContactChange ||=
          Object.entries(addressData).some(
            ([key, value]) =>
              key !== "id" &&
              ownPerson?.address?.[key as keyof Address] !== value,
          ) ||
          (resolvedPostcode !== undefined &&
            resolvedPostcode.id !== ownPerson?.address?.postcodeId);
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

        if (personData) {
          const success = await patchEntity(Person, personData);
          if (!success) {
            return reply.status(400).send({
              message: `Person (id=${personData.id}) not updated.`,
            });
          }
        }

        if (addressData?.id) {
          const success = await patchOrReplaceAddress(
            volunteer.personId,
            addressData as Partial<Address> & { id: number },
            resolvedPostcode ?? {},
          );
          if (!success) {
            return reply.status(400).send({
              message: `Address (id=${addressData.id}) not updated.`,
            });
          }
        } else if (addressData) {
          const { id: _id, ...newAddress } = addressData;
          const address = await createAddress(
            newAddress,
            resolvedPostcode ?? {},
          );
          if (!address) {
            throw new BadRequestError("Address not saved: unknown postcode.");
          }
          await fastify.db.personRepository.update(
            { id: volunteer.personId },
            { addressId: address.id },
          );
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
        throw error;
      } finally {
        if (snapshotBefore !== null) {
          await alertOnChange(
            async () => snapshotBefore !== (await takeSnapshot()),
            async () => {
              const editedName = Object.assign(
                new Person(),
                ownPerson,
                personData,
              ).name;
              fastify.notify.arrival(
                getVolunteerSelfEditNotificationText(editedName, id),
              );
            },
          );
        }
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
      resetCallerMask(request);

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
