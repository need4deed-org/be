import { getRef } from "../utils";

const paginationProps = {
  page: { type: "integer", minimum: 1 },
  limit: { type: "integer", minimum: 1, maximum: 120 },
};
const languageProp = { language: { type: "string" } };

export const opportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...languageProp,
    type: {
      anyOf: [
        getRef("OpportunityType#"),
        { type: "array", items: getRef("OpportunityType#") },
      ],
    },
    status: {
      anyOf: [
        getRef("OpportunityStatusType#"),
        { type: "array", items: getRef("OpportunityStatusType#") },
      ],
    },
  },
  additionalProperties: false,
};

export const agentListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...languageProp,
  },
  additionalProperties: false,
};

export const volunteerOpportunityListQuerySchema = {
  type: "object",
  properties: {
    ...paginationProps,
    ...languageProp,
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
