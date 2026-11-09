import {
  OpportunitySortField,
  QueryParamsKeys,
  RECOMMENDED_MATCHES_DEFAULT_LIMIT,
  RECOMMENDED_MATCHES_MAX_LIMIT,
  SortOrder,
} from "need4deed-sdk";
import { getRef } from "../utils";

const paginationProps = {
  page: { type: "integer", minimum: 1 },
  limit: { type: "integer", minimum: 1, maximum: 120 },
};
const langProp = { language: { type: "string" } };

const recommendedLimitProp = {
  limit: {
    type: "integer",
    minimum: 1,
    maximum: RECOMMENDED_MATCHES_MAX_LIMIT,
    default: RECOMMENDED_MATCHES_DEFAULT_LIMIT,
  },
};

export const recommendedVolunteersQuerySchema = {
  type: "object",
  properties: recommendedLimitProp,
  additionalProperties: false,
};

export const recommendedOpportunitiesQuerySchema = {
  type: "object",
  properties: { ...langProp, ...recommendedLimitProp },
  additionalProperties: false,
};

export const volunteerCommuteQuerySchema = {
  type: "object",
  properties: {
    opportunity: {
      type: "array",
      items: { type: "integer", minimum: 1 },
      minItems: 1,
      maxItems: 20,
    },
  },
  required: ["opportunity"],
  additionalProperties: false,
};

export const paginationQuerySchema = {
  type: "object",
  properties: paginationProps,
  additionalProperties: false,
};

export const langQuerySchema = {
  type: "object",
  properties: langProp,
};

export const otherOpportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    search: { type: "string", maxLength: 100 },
  },
  additionalProperties: false,
};

export const eventListQuerySchema = {
  type: "object",
  properties: {
    ...langProp,
    search: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
  },
};

const sortOrderProps = {
  sortOrder: {
    type: "string",
    enum: Object.values(SortOrder),
  },
};

const commuteFilterProps = (idKey: QueryParamsKeys) => ({
  [idKey]: { type: "integer", minimum: 1 },
  [QueryParamsKeys.MAX_COMMUTE_MINUTES]: {
    type: "integer",
    minimum: 1,
    maximum: 600,
  },
});

const commuteFilterDependencies = (idKey: QueryParamsKeys) => ({
  [idKey]: [QueryParamsKeys.MAX_COMMUTE_MINUTES],
  [QueryParamsKeys.MAX_COMMUTE_MINUTES]: [idKey],
});

const sortByProps = {
  sortBy: {
    type: "string",
    enum: Object.values(OpportunitySortField),
  },
};

export const opportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...sortOrderProps,
    ...sortByProps,
    ...langProp,
    appointmentDateFrom: { type: "string" },
    appointmentDateTo: { type: "string" },
    hasAppointmentDate: { type: "boolean" },
    excludeAccompanying: { type: "boolean" },
    filter: {
      type: "object",
      properties: {
        language: { type: "array", items: { type: "string" } },
        district: { type: "array", items: { type: "string" } },
        availability: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        type: {
          type: "array",
          items: getRef("OpportunityType#"),
        },
        agentId: {
          anyOf: [
            { type: "integer", minimum: 1 },
            { type: "array", items: { type: "integer", minimum: 1 } },
          ],
        },
        status: {
          type: "array",
          items: getRef("OpportunityStatusType#"),
        },
        match: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        ...commuteFilterProps(QueryParamsKeys.COMMUTE_VOLUNTEER_ID),
      },
      dependencies: commuteFilterDependencies(
        QueryParamsKeys.COMMUTE_VOLUNTEER_ID,
      ),
    },
    additionalProperties: false,
  },
};

export const agentListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    ...sortOrderProps,
    filter: {
      type: "object",
      properties: {
        search: { type: "string" },
        street: { type: "string" },
        district: { type: "array", items: { type: "string" } },
        type: { type: "array", items: { type: "string" } },
        status: { type: "array", items: { type: "string" } },
        volunteerSearch: { type: "array", items: { type: "string" } },
        engagementStatus: { type: "array", items: { type: "string" } },
        services: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const OWNER_AGENT_PATTERN = "^(none|[1-9][0-9]{0,8})$";

export const volunteerListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    ...sortOrderProps,
    listType: { type: "string", enum: ["card", "table"] },
    filter: {
      type: "object",
      properties: {
        type: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        search: { type: "string" },
        language: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        activity: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        skill: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        availability: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        district: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        ownerAgent: {
          anyOf: [
            { type: "string", pattern: OWNER_AGENT_PATTERN },
            {
              type: "array",
              items: { type: "string", pattern: OWNER_AGENT_PATTERN },
            },
          ],
        },
        engagement: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        match: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
        ...commuteFilterProps(QueryParamsKeys.COMMUTE_OPPORTUNITY_ID),
      },
      dependencies: commuteFilterDependencies(
        QueryParamsKeys.COMMUTE_OPPORTUNITY_ID,
      ),
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const userListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...sortOrderProps,
    search: { type: "string" },
    role: getRef("UserRole#"),
  },
  additionalProperties: false,
};

export const postListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    search: { type: "string" },
    authorId: { type: "integer", minimum: 1 },
  },
  additionalProperties: false,
};

export const volunteerOpportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    type: getRef("VolunteerStateTypeType#"),
    status: getRef("OpportunityStatusType#"),
    agentId: {
      anyOf: [
        { type: "integer", minimum: 1 },
        { type: "array", items: { type: "integer", minimum: 1 } },
      ],
    },
    search: { type: "string" },
    activity: { type: "string" },
    skill: { type: "string" },
    availability: {
      anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
    },
    district: { type: "string" },
  },
  required: ["type", "status"],
  additionalProperties: false,
};
