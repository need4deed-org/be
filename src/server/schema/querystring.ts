import { SortOrder } from "need4deed-sdk";
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

const sortOrderProps = {
  sortOrder: {
    type: "string",
    enum: Object.values(SortOrder),
  },
};

export const opportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...sortOrderProps,
    ...langProp,
    filter: {
      type: "object",
      properties: {
        language: { type: "array", items: { type: "string" } },
        district: { type: "array", items: { type: "string" } },
        type: {
          type: "array",
          items: getRef("OpportunityType#"),
        },
        status: {
          type: "array",
          items: getRef("OpportunityStatusType#"),
        },
      },
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

export const volunteerListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    ...sortOrderProps,
    // Selects which relations the list loads: "table" loads only what the
    // table view renders (languages + locations); "card" (default) loads all
    // collections. Lets the table view skip activities/skills/availability.
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
        availability: { type: "string" },
        district: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
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
      },
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

export const volunteerOpportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...langProp,
    type: getRef("VolunteerStateTypeType#"),
    status: getRef("OpportunityStatusType#"),
    agentId: { type: "number" },
    search: { type: "string" },
    german: { type: "boolean" },
    activity: { type: "string" },
    skill: { type: "string" },
    availability: { type: "string" },
    district: { type: "string" },
  },
  required: ["type", "status"],
  additionalProperties: false,
};
