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
