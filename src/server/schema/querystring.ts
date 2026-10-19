import {
  OpportunitySortField,
  QueryParamsKeys,
  SortOrder,
} from "need4deed-sdk";
import { getRef } from "../utils";

const paginationProps = {
  page: { type: "integer", minimum: 1 },
  limit: { type: "integer", minimum: 1, maximum: 120 },
};
const langProp = { language: { type: "string" } };

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

const commuteFilterProps = {
  [QueryParamsKeys.COMMUTE_POSTCODE]: { type: "string", pattern: "^[0-9]{5}$" },
  [QueryParamsKeys.MAX_COMMUTE_MINUTES]: {
    type: "integer",
    minimum: 1,
    maximum: 600,
  },
};

const commuteFilterDependencies = {
  [QueryParamsKeys.COMMUTE_POSTCODE]: [QueryParamsKeys.MAX_COMMUTE_MINUTES],
  [QueryParamsKeys.MAX_COMMUTE_MINUTES]: [QueryParamsKeys.COMMUTE_POSTCODE],
};

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
        status: {
          type: "array",
          items: getRef("OpportunityStatusType#"),
        },
        ...commuteFilterProps,
      },
      dependencies: commuteFilterDependencies,
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
        ...commuteFilterProps,
      },
      dependencies: commuteFilterDependencies,
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
    agentId: { type: "number", minimum: 1 },
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
