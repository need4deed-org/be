export const opportunityVolunteerPatchSchema = {
  type: "object",
  properties: {
    status: { $ref: "OpportunityVolunteerStatusType#" },
  },
  additionalProperties: false,
};
