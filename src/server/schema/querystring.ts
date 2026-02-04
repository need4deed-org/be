import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { getRef } from "../utils";

export const opportunityListQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 120 },
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
export type OpportunityListQuery = {
  page?: number;
  limit?: number;
  type?: OpportunityType | OpportunityType[];
  status?: OpportunityStatusType | OpportunityStatusType[];
};
