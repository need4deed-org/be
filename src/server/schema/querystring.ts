export const opportunityListQuerySchema = {
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 120 },
    type: {
      oneOf: [
        { $ref: "OpportunityType#" },
        { type: "array", items: { $ref: "OpportunityType#" } },
      ],
    },
    status: {
      oneOf: [
        { $ref: "OpportunityStatusType#" },
        { type: "array", items: { $ref: "OpportunityStatusType#" } },
      ],
    },
  },
  additionalProperties: false,
};
export type OpportunityListQuery = {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
};
