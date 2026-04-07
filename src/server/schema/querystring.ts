import { SortOrder } from "need4deed-sdk";
import { getRef } from "../utils";

const paginationProps = {
  page: { type: "integer", minimum: 1 },
  limit: { type: "integer", minimum: 1, maximum: 120 },
};
const langProp = { language: { type: "string" } };

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
