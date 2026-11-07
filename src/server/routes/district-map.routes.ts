import { FastifyInstance } from "fastify";
import {
  ApiAgentDistrictAggregateQuery,
  ApiAgentDistrictMarkerQuery,
  ApiDistrictAggregate,
  ApiDistrictMarker,
  ApiDistrictMarkerChild,
  ApiDistrictMarkerGet,
  apiDistrictMarkerMaxEntities,
  ApiOpportunityDistrictAggregateQuery,
  ApiOpportunityDistrictMarkerQuery,
  ApiVolunteerDistrictAggregateQuery,
  ApiVolunteerDistrictMarkerQuery,
  EntityTableName,
  OpportunityType,
  UserRole,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import {
  And,
  Equal,
  FindOperator,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Raw,
} from "typeorm";
import { UnauthorizedError } from "../../config/error/fastify";
import District from "../../data/entity/location/district.entity";
import Postcode from "../../data/entity/location/postcode.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { getDistrictCentroids } from "../../data/utils/get-district";
import {
  getOpportunityLocation,
  getOwnLocationPostcode,
} from "../../services/dto/dto-opportunity";
import {
  getAvailability,
  getCoordinates,
  getLanguages,
} from "../../services/dto/utils";
import {
  agentDistrictAggregateQuerySchema,
  agentDistrictMarkerQuerySchema,
  districtAggregateResponseSchema,
  districtMarkerResponseSchema,
  opportunityDistrictAggregateQuerySchema,
  opportunityDistrictMarkerQuerySchema,
  volunteerDistrictAggregateQuerySchema,
  volunteerDistrictMarkerQuerySchema,
} from "../schema/district-map.schema";
import {
  QuerystringAgentFiltering,
  QuerystringOpportunityFiltering,
  QuerystringVolunteerFiltering,
  ReplyData,
} from "../types";
import { addAgentTypeServiceTranslations } from "../utils/data/add-agent-type-service-translations";
import { getDistrictLocationBucket } from "../utils/data/district-map";
import { getAgentWhere } from "../utils/data/get-agent-where";
import {
  findAvailabilityDealIds,
  findOpportunityAvailabilityDealIds,
} from "../utils/data/get-availability-deal-ids";
import { getCallerAgentIds } from "../utils/data/get-caller-agent-ids";
import { getOpportunityWhere } from "../utils/data/get-opportunity-where";
import {
  getVolunteerWhere,
  normalizeVolunteerStatusFilter,
} from "../utils/data/get-volunteer-where";
import { isStaffRole } from "../utils/data/is-staff-role";
import { andIntoWhere, mergeIntoWhere } from "../utils/data/merge-into-where";
import { closedForVolunteersIdWhere } from "../utils/data/no-match-found";
import { translateOpportunities } from "../utils/data/translate-opportunities";
import {
  maskForCaller,
  resolveCallerMask,
} from "../utils/pii/pre-serialization";
import { resolveVolunteerVisibility } from "../utils/pii/volunteer-visibility";

type DistrictFilterValue = string | number | boolean | Array<string | number>;

function toStringFilter(
  value: DistrictFilterValue | undefined,
): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value.map(String) : String(value);
}

function toStringArray(
  value: DistrictFilterValue | undefined,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return (Array.isArray(value) ? value : [value]).map(String);
}

function toNumberFilter(
  value: DistrictFilterValue | undefined,
): number | number[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const values = Array.isArray(value) ? value : [value];
  const numbers = values.map(Number).filter(Number.isInteger);
  return Array.isArray(value) ? numbers : numbers[0];
}

function normalizeAgentFilter(
  filter?: ApiAgentDistrictAggregateQuery["filter"],
): QuerystringAgentFiltering["filter"] {
  return {
    type: toStringArray(filter?.type),
    status: toStringArray(filter?.status),
    engagementStatus: toStringArray(filter?.engagementStatus),
    services: toStringArray(filter?.services),
    volunteerSearch: toStringArray(filter?.volunteerSearch),
  };
}

function normalizeOpportunityFilter(
  filter?: ApiOpportunityDistrictAggregateQuery["filter"],
): QuerystringOpportunityFiltering["filter"] {
  return {
    type: toStringFilter(filter?.type),
    status: toStringFilter(filter?.status),
    agentId: toNumberFilter(filter?.agentId),
    match: toStringFilter(filter?.match),
    activity: toStringFilter(filter?.activity),
    skill: toStringFilter(filter?.skill),
    language: toStringFilter(filter?.language),
    availability: toStringFilter(filter?.availability),
  };
}

function normalizeVolunteerFilter(
  filter?: ApiVolunteerDistrictAggregateQuery["filter"],
): QuerystringVolunteerFiltering["filter"] {
  return {
    type: toStringFilter(filter?.type),
    language: toStringFilter(filter?.language),
    activity: toStringFilter(filter?.activity),
    skill: toStringFilter(filter?.skill),
    availability: toStringFilter(filter?.availability),
    engagement: normalizeVolunteerStatusFilter(
      toStringFilter(filter?.engagement),
    ),
    match: normalizeVolunteerStatusFilter(toStringFilter(filter?.match)),
  };
}

function createDistrictAggregate(districts: District[]): ApiDistrictAggregate {
  return {
    districts: districts.map(({ id }) => ({ districtId: id, count: 0 })),
    unassignedBerlin: 0,
    outsideBerlin: 0,
    remote: 0,
  };
}

function addToAggregate(
  aggregate: ApiDistrictAggregate,
  location: ReturnType<typeof getDistrictLocationBucket>,
): void {
  if ("districtId" in location) {
    const district = aggregate.districts.find(
      ({ districtId }) => districtId === location.districtId,
    );
    if (district) {
      district.count += 1;
    } else {
      aggregate.outsideBerlin += 1;
    }
    return;
  }

  aggregate[location.bucket] += 1;
}

function getAgentDistrictWhere(
  baseWhere: FindOptionsWhere<Agent>,
  districtId: number,
): FindOptionsWhere<Agent>[] {
  return [
    { ...baseWhere, districtId },
    {
      ...baseWhere,
      districtId: IsNull(),
      address: { postcode: { id: firstDistrictPostcodeIdWhere(districtId) } },
    },
  ];
}

function getVolunteerDistrictWhere(
  baseWhere: FindOptionsWhere<Volunteer>,
  districtId: number,
): FindOptionsWhere<Volunteer> | FindOptionsWhere<Volunteer>[] {
  const districtWhere = {
    person: {
      address: {
        postcode: { id: firstDistrictPostcodeIdWhere(districtId) },
      },
    },
  };
  if (Array.isArray(baseWhere.person)) {
    return baseWhere.person.map((personWhere) => {
      const where: FindOptionsWhere<Volunteer> = {
        ...baseWhere,
        person: personWhere,
      };
      mergeIntoWhere(where, districtWhere);
      return where;
    });
  }
  const where: FindOptionsWhere<Volunteer> = { ...baseWhere };
  mergeIntoWhere(where, districtWhere);
  return where;
}

function firstDistrictPostcodeIdWhere(districtId: number) {
  return Raw(
    (column) => `${column} IN (
      SELECT map_dp.postcode_id
        FROM district_postcode map_dp
       WHERE map_dp.district_id = :districtId
         AND map_dp.id = (
           SELECT MIN(first_map_dp.id)
             FROM district_postcode first_map_dp
            WHERE first_map_dp.postcode_id = map_dp.postcode_id
         )
    )`,
    { districtId },
  );
}

function getOpportunityDistrictWhere(
  baseWhere: FindOptionsWhere<Opportunity> | FindOptionsWhere<Opportunity>[],
  districtId: number,
): FindOptionsWhere<Opportunity>[] {
  const branches = Array.isArray(baseWhere) ? baseWhere : [baseWhere];
  const locations: FindOptionsWhere<Opportunity>[] = [
    { districtId },
    {
      districtId: IsNull(),
      type: Not(OpportunityType.ACCOMPANYING),
      address: { postcode: { id: firstDistrictPostcodeIdWhere(districtId) } },
    },
    {
      districtId: IsNull(),
      type: Not(OpportunityType.ACCOMPANYING),
      addressId: IsNull(),
      deal: { postcode: { id: firstDistrictPostcodeIdWhere(districtId) } },
    },
    {
      districtId: IsNull(),
      type: OpportunityType.ACCOMPANYING,
      accompanying: {
        postcode: { id: firstDistrictPostcodeIdWhere(districtId) },
      },
    },
    {
      districtId: IsNull(),
      type: Not(OpportunityType.ACCOMPANYING),
      addressId: IsNull(),
      agent: { districtId },
    },
    {
      districtId: IsNull(),
      type: Not(OpportunityType.ACCOMPANYING),
      addressId: IsNull(),
      agent: {
        districtId: IsNull(),
        address: { postcode: { id: firstDistrictPostcodeIdWhere(districtId) } },
      },
    },
    {
      districtId: IsNull(),
      type: OpportunityType.ACCOMPANYING,
      accompanying: { postcode: IsNull() },
      agent: { districtId },
    },
    {
      districtId: IsNull(),
      type: OpportunityType.ACCOMPANYING,
      accompanying: { postcode: IsNull() },
      agent: {
        districtId: IsNull(),
        address: { postcode: { id: firstDistrictPostcodeIdWhere(districtId) } },
      },
    },
  ];
  return branches.flatMap((branch) =>
    locations.map((location) => {
      const merged: FindOptionsWhere<Opportunity> = { ...branch };
      const conditions: FindOptionsWhere<Opportunity> = { ...location };
      const type = conditions.type;
      delete conditions.type;
      mergeIntoWhere(merged, conditions);
      if (type !== undefined) {
        const existingType = branch.type;
        merged.type =
          existingType === undefined
            ? type
            : And(
                existingType instanceof FindOperator
                  ? existingType
                  : Equal(existingType),
                type instanceof FindOperator ? type : Equal(type),
              );
      }
      return merged;
    }),
  );
}

function createMarker(
  districtId: number,
  entity: ApiDistrictMarker["entity"],
  child: ApiDistrictMarkerChild,
  latitude: number | null,
  longitude: number | null,
): ApiDistrictMarker {
  return {
    lat: latitude,
    lon: longitude,
    districtId,
    children: [child],
    entity,
  };
}

function groupMarkers(
  districtId: number,
  entity: ApiDistrictMarker["entity"],
  items: Array<{
    child: ApiDistrictMarkerChild;
    latitude: number | null;
    longitude: number | null;
  }>,
): ApiDistrictMarker[] {
  const markersByLocation = new Map<string, ApiDistrictMarker>();

  for (const { child, latitude, longitude } of items) {
    const key =
      latitude === null || longitude === null
        ? `missing:${child.id}`
        : `${latitude}:${longitude}`;
    const existing = markersByLocation.get(key);
    if (existing) {
      existing.children.push(child);
    } else {
      markersByLocation.set(
        key,
        createMarker(districtId, entity, child, latitude, longitude),
      );
    }
  }

  return [...markersByLocation.values()];
}

function agentRelations() {
  return ["address.postcode.districtPostcode", "agentType"];
}

function opportunityRelations() {
  return [
    "agent.address.postcode.districtPostcode",
    "address.postcode.districtPostcode",
    "accompanying.postcode.districtPostcode",
    "deal.postcode.districtPostcode",
    "deal.dealLanguage.language",
    "deal.dealTimeslot.timeslot",
    "onetimer",
  ];
}

function getOpportunityPhysicalLocation(opportunity: Opportunity): {
  districtId?: number;
  postcode?: Postcode;
} {
  return {
    districtId: getOpportunityLocation(opportunity).districtId,
    postcode: getOwnLocationPostcode(opportunity) ?? opportunity.deal?.postcode,
  };
}

const agentSelect = {
  id: true,
  title: true,
  districtId: true,
  agentTypeId: true,
  agentType: { id: true, title: true },
  address: {
    id: true,
    postcode: {
      id: true,
      value: true,
      latitude: true,
      longitude: true,
      districtPostcode: { id: true, districtId: true },
    },
  },
};

const opportunitySelect = {
  id: true,
  title: true,
  type: true,
  districtId: true,
  agentId: true,
  agent: {
    id: true,
    districtId: true,
    address: {
      id: true,
      postcode: {
        id: true,
        value: true,
        latitude: true,
        longitude: true,
        districtPostcode: { id: true, districtId: true },
      },
    },
  },
  address: {
    id: true,
    postcode: {
      id: true,
      value: true,
      latitude: true,
      longitude: true,
      districtPostcode: { id: true, districtId: true },
    },
  },
  accompanying: {
    id: true,
    postcode: {
      id: true,
      value: true,
      latitude: true,
      longitude: true,
      districtPostcode: { id: true, districtId: true },
    },
  },
  deal: {
    id: true,
    postcode: {
      id: true,
      value: true,
      latitude: true,
      longitude: true,
      districtPostcode: { id: true, districtId: true },
    },
    dealLanguage: {
      id: true,
      proficiency: true,
      purpose: true,
      language: { id: true, title: true },
    },
    dealTimeslot: {
      id: true,
      timeslot: {
        id: true,
        rrule: true,
        start: true,
        end: true,
        occasional: true,
      },
    },
  },
  onetimer: { id: true, date: true },
};

export async function agentDistrictRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ApiAgentDistrictAggregateQuery;
    Reply: ReplyData<ApiDistrictAggregate>;
  }>(
    "/districts",
    {
      schema: {
        querystring: agentDistrictAggregateQuerySchema,
        response: districtAggregateResponseSchema,
      },
    },
    async (request, reply) => {
      const filter = normalizeAgentFilter(request.query.filter);
      const visibility = await resolveCallerMask(request);
      const where = await getAgentWhere(filter, visibility);
      if (!isStaffRole(request.authUser?.role)) {
        where.unclaimed = false;
      }

      const [agents, districts] = await Promise.all([
        fastify.db.agentRepository.find({
          where,
          select: agentSelect,
          relations: agentRelations(),
          relationLoadStrategy: "query",
        }),
        fastify.db.districtRepository.find({
          select: { id: true, title: true },
          order: { id: "ASC" },
        }),
      ]);
      const data = createDistrictAggregate(districts);

      for (const agent of agents) {
        addToAggregate(
          data,
          getDistrictLocationBucket({
            districtId: agent.districtId,
            postcode: agent.address?.postcode,
          }),
        );
      }

      return reply.status(200).send({
        message: "Agent district aggregates",
        data,
      });
    },
  );

  fastify.get<{
    Querystring: ApiAgentDistrictMarkerQuery;
    Reply: ReplyData<ApiDistrictMarkerGet>;
  }>(
    "/map",
    {
      schema: {
        querystring: agentDistrictMarkerQuerySchema,
        response: districtMarkerResponseSchema,
      },
    },
    async (request, reply) => {
      const filter = normalizeAgentFilter(request.query.filter);
      const visibility = await resolveCallerMask(request);
      const baseWhere = await getAgentWhere(filter, visibility);
      if (!isStaffRole(request.authUser?.role)) {
        baseWhere.unclaimed = false;
      }

      const [agentRows, centroids] = await Promise.all([
        fastify.db.agentRepository.findAndCount({
          where: getAgentDistrictWhere(baseWhere, request.query.districtId),
          select: agentSelect,
          relations: agentRelations(),
          relationLoadStrategy: "query",
          order: { id: "ASC" },
          take: apiDistrictMarkerMaxEntities,
        }),
        getDistrictCentroids([request.query.districtId]),
      ]);
      await addAgentTypeServiceTranslations(agentRows[0]);

      const items = agentRows[0]
        .filter((agent) => {
          const location = getDistrictLocationBucket({
            districtId: agent.districtId,
            postcode: agent.address?.postcode,
          });
          return (
            "districtId" in location &&
            location.districtId === request.query.districtId
          );
        })
        .map((agent) => {
          const coordinates = getCoordinates(agent.address?.postcode);
          const centroid = centroids.get(request.query.districtId);
          const latitude =
            coordinates.latitude !== null && coordinates.longitude !== null
              ? coordinates.latitude
              : (centroid?.latitude ?? null);
          const longitude =
            coordinates.latitude !== null && coordinates.longitude !== null
              ? coordinates.longitude
              : (centroid?.longitude ?? null);
          const child: ApiDistrictMarkerChild = {
            id: agent.id,
            title: agent.title,
            ...(agent.agentTypeId && agent.agentType
              ? {
                  type: {
                    id: agent.agentTypeId,
                    title: agent.agentType.translations ?? {
                      de: agent.agentType.title,
                    },
                  },
                }
              : {}),
          };

          return { child, latitude, longitude };
        });

      const data: ApiDistrictMarkerGet = {
        markers: groupMarkers(
          request.query.districtId,
          EntityTableName.AGENT,
          items,
        ),
        total: agentRows[1],
        maxEntities: apiDistrictMarkerMaxEntities,
      };

      return reply.status(200).send({
        message: "Agent district markers",
        data,
      });
    },
  );
}

export async function opportunityDistrictRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ApiOpportunityDistrictAggregateQuery;
    Reply: ReplyData<ApiDistrictAggregate>;
  }>(
    "/districts",
    {
      schema: {
        querystring: opportunityDistrictAggregateQuerySchema,
        response: districtAggregateResponseSchema,
      },
    },
    async (request, reply) => {
      const filter = normalizeOpportunityFilter(request.query.filter);
      const availabilityDealIds = await findOpportunityAvailabilityDealIds(
        filter.availability,
      );
      const where = getOpportunityWhere(
        filter,
        undefined,
        undefined,
        availabilityDealIds,
      );
      if (request.authUser?.role === UserRole.AGENT) {
        const agentIds = await getCallerAgentIds(
          request,
          request.authUser.personId,
        );
        if (agentIds.length === 0) {
          return reply.status(200).send({
            message: "Opportunity district aggregates",
            data: createDistrictAggregate(
              await fastify.db.districtRepository.find({
                select: { id: true, title: true },
                order: { id: "ASC" },
              }),
            ),
          });
        }
        for (const branch of Array.isArray(where) ? where : [where]) {
          mergeIntoWhere([branch], { agent: { id: In(agentIds) } });
        }
      }
      if (request.authUser?.role === UserRole.VOLUNTEER) {
        andIntoWhere(where, "id", closedForVolunteersIdWhere());
      }

      const [opportunities, districts] = await Promise.all([
        fastify.db.opportunityRepository.find({
          where,
          select: opportunitySelect,
          relations: opportunityRelations(),
          relationLoadStrategy: "query",
        }),
        fastify.db.districtRepository.find({
          select: { id: true, title: true },
          order: { id: "ASC" },
        }),
      ]);
      const data = createDistrictAggregate(districts);

      for (const opportunity of opportunities) {
        const { districtId, postcode } =
          getOpportunityPhysicalLocation(opportunity);
        addToAggregate(
          data,
          getDistrictLocationBucket({ districtId, postcode }),
        );
      }

      return reply.status(200).send({
        message: "Opportunity district aggregates",
        data,
      });
    },
  );

  fastify.get<{
    Querystring: ApiOpportunityDistrictMarkerQuery;
    Reply: ReplyData<ApiDistrictMarkerGet>;
  }>(
    "/map",
    {
      schema: {
        querystring: opportunityDistrictMarkerQuerySchema,
        response: districtMarkerResponseSchema,
      },
    },
    async (request, reply) => {
      const filter = normalizeOpportunityFilter(request.query.filter);
      const availabilityDealIds = await findOpportunityAvailabilityDealIds(
        filter.availability,
      );
      const baseWhere = getOpportunityWhere(
        filter,
        undefined,
        undefined,
        availabilityDealIds,
      );
      if (request.authUser?.role === UserRole.AGENT) {
        const agentIds = await getCallerAgentIds(
          request,
          request.authUser.personId,
        );
        if (agentIds.length === 0) {
          return reply.status(200).send({
            message: "Opportunity district markers",
            data: {
              markers: [],
              total: 0,
              maxEntities: apiDistrictMarkerMaxEntities,
            },
          });
        }
        for (const branch of Array.isArray(baseWhere)
          ? baseWhere
          : [baseWhere]) {
          mergeIntoWhere([branch], { agent: { id: In(agentIds) } });
        }
      }
      if (request.authUser?.role === UserRole.VOLUNTEER) {
        andIntoWhere(baseWhere, "id", closedForVolunteersIdWhere());
      }

      const where = getOpportunityDistrictWhere(
        baseWhere,
        request.query.districtId,
      );
      const [result, centroids] = await Promise.all([
        fastify.db.opportunityRepository.findAndCount({
          where,
          select: opportunitySelect,
          relations: opportunityRelations(),
          relationLoadStrategy: "query",
          order: { id: "ASC" },
          take: apiDistrictMarkerMaxEntities,
        }),
        getDistrictCentroids([request.query.districtId]),
      ]);

      await translateOpportunities(fastify, result[0], request.query.language);
      const items = result[0]
        .filter((opportunity) => {
          const { districtId, postcode } =
            getOpportunityPhysicalLocation(opportunity);
          const location = getDistrictLocationBucket({ districtId, postcode });
          return (
            "districtId" in location &&
            location.districtId === request.query.districtId
          );
        })
        .map((opportunity) => {
          const { districtId, postcode } =
            getOpportunityPhysicalLocation(opportunity);
          const coordinates = getCoordinates(postcode);
          const centroid = centroids.get(request.query.districtId);
          const hasCoordinates =
            coordinates.latitude !== null && coordinates.longitude !== null;
          const child: ApiDistrictMarkerChild = {
            id: opportunity.id,
            title: opportunity.title,
            languages: getLanguages(opportunity.deal?.dealLanguage ?? []),
            availability: getAvailability(opportunity.deal?.dealTimeslot ?? []),
          };

          return {
            child,
            latitude: hasCoordinates
              ? coordinates.latitude
              : (centroid?.latitude ?? null),
            longitude: hasCoordinates
              ? coordinates.longitude
              : (centroid?.longitude ?? null),
            districtId,
          };
        });

      const data: ApiDistrictMarkerGet = {
        markers: groupMarkers(
          request.query.districtId,
          EntityTableName.OPPORTUNITY,
          items,
        ),
        total: result[1],
        maxEntities: apiDistrictMarkerMaxEntities,
      };

      return reply.status(200).send({
        message: "Opportunity district markers",
        data,
      });
    },
  );
}

export async function volunteerDistrictRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: ApiVolunteerDistrictAggregateQuery;
    Reply: ReplyData<ApiDistrictAggregate>;
  }>(
    "/districts",
    {
      schema: {
        querystring: volunteerDistrictAggregateQuerySchema,
        response: districtAggregateResponseSchema,
      },
    },
    async (request, reply) => {
      const filter = normalizeVolunteerFilter(request.query.filter);
      const [visibility, availabilityDealIds] = await Promise.all([
        resolveVolunteerVisibility(request),
        findAvailabilityDealIds(filter.availability),
      ]);
      const where = getVolunteerWhere(filter, visibility, availabilityDealIds);
      const [volunteers, districts] = await Promise.all([
        fastify.db.volunteerRepository.find({
          where,
          select: {
            id: true,
            person: {
              id: true,
              address: {
                id: true,
                postcode: {
                  id: true,
                  value: true,
                  latitude: true,
                  longitude: true,
                  districtPostcode: { id: true, districtId: true },
                },
              },
            },
          },
          relations: ["person.address.postcode.districtPostcode"],
          relationLoadStrategy: "query",
        }),
        fastify.db.districtRepository.find({
          select: { id: true, title: true },
          order: { id: "ASC" },
        }),
      ]);
      const data = createDistrictAggregate(districts);

      for (const volunteer of volunteers) {
        addToAggregate(
          data,
          getDistrictLocationBucket({
            postcode: volunteer.person?.address?.postcode,
          }),
        );
      }

      return reply.status(200).send({
        message: "Volunteer district aggregates",
        data,
      });
    },
  );

  fastify.get<{
    Querystring: ApiVolunteerDistrictMarkerQuery;
    Reply: ReplyData<ApiDistrictMarkerGet>;
  }>(
    "/map",
    {
      schema: {
        querystring: volunteerDistrictMarkerQuerySchema,
        response: districtMarkerResponseSchema,
      },
    },
    async (request, reply) => {
      if (request.authUser?.role === UserRole.AGENT) {
        throw new UnauthorizedError(
          "Agent users cannot access individual volunteer markers.",
        );
      }
      const filter = normalizeVolunteerFilter(request.query.filter);
      const [visibility, availabilityDealIds] = await Promise.all([
        resolveVolunteerVisibility(request),
        findAvailabilityDealIds(filter.availability),
      ]);
      const where = getVolunteerWhere(filter, visibility, availabilityDealIds);
      const [[volunteers, total], centroids] = await Promise.all([
        fastify.db.volunteerRepository.findAndCount({
          where: getVolunteerDistrictWhere(where, request.query.districtId),
          select: {
            id: true,
            statusType: true,
            person: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              address: {
                id: true,
                postcode: {
                  id: true,
                  latitude: true,
                  longitude: true,
                  districtPostcode: { id: true, districtId: true },
                },
              },
            },
            deal: {
              dealLanguage: {
                id: true,
                proficiency: true,
                purpose: true,
                language: { id: true, title: true },
              },
              dealTimeslot: {
                id: true,
                timeslot: {
                  id: true,
                  rrule: true,
                  start: true,
                  end: true,
                  occasional: true,
                },
              },
            },
          },
          relations: [
            "person.address.postcode.districtPostcode",
            "deal.dealLanguage.language",
            "deal.dealTimeslot.timeslot",
          ],
          relationLoadStrategy: "query",
          order: { id: "ASC" },
          take: apiDistrictMarkerMaxEntities,
        }),
        getDistrictCentroids([request.query.districtId]),
      ]);
      await maskForCaller(request, volunteers);

      const items = volunteers
        .filter((volunteer) => {
          const location = getDistrictLocationBucket({
            postcode: volunteer.person?.address?.postcode,
          });
          return (
            "districtId" in location &&
            location.districtId === request.query.districtId
          );
        })
        .map((volunteer) => {
          const coordinates = getCoordinates(
            volunteer.person?.address?.postcode,
          );
          const centroid = centroids.get(request.query.districtId);
          const hasCoordinates =
            coordinates.latitude !== null && coordinates.longitude !== null;
          const child: ApiDistrictMarkerChild = {
            id: volunteer.id,
            title: volunteer.person?.name || "Volunteer",
            languages: getLanguages(volunteer.deal?.dealLanguage ?? []),
            availability: getAvailability(volunteer.deal?.dealTimeslot ?? []),
            statusTypes: volunteerTypesFromStatusType(volunteer.statusType),
          };

          return {
            child,
            latitude: hasCoordinates
              ? coordinates.latitude
              : (centroid?.latitude ?? null),
            longitude: hasCoordinates
              ? coordinates.longitude
              : (centroid?.longitude ?? null),
          };
        });

      const data: ApiDistrictMarkerGet = {
        markers: groupMarkers(
          request.query.districtId,
          EntityTableName.VOLUNTEER,
          items,
        ),
        total,
        maxEntities: apiDistrictMarkerMaxEntities,
      };

      return reply.status(200).send({
        message: "Volunteer district markers (postcode centroids)",
        data,
      });
    },
  );
}
