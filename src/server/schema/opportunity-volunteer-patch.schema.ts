// PATCH /volunteer/:id/opportunity-linked/:m2mId patches an OpportunityVolunteer
// m2m row, not an Opportunity — distinct from ApiVolunteerOpportunityPatch
// (the Opportunity entity's own patch shape), which this route used to reuse
// by mistake. `status` was silently dropped by that schema's
// `additionalProperties: false`, so a status update never reached the
// handler.
export const opportunityVolunteerPatchSchema = {
  type: "object",
  properties: {
    status: { $ref: "OpportunityVolunteerStatusType#" },
  },
  additionalProperties: false,
};
