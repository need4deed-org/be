import { responseErrors } from "./responseErrors";

// Body for POST /opportunity (SDK OpportunityFormDataWithAgentSubmitter): the
// dashboard's typed create-opportunity form, plus agent_id + the optional
// submitted_by_id. Unlike the legacy opportunity form, activities/skills/
// languages/districts are numeric option ids from GET /option/*, not
// free-text titles/ISO-codes — see dealParserOpportunityCreate. The form is
// loosely typed (voidable), so additional properties are allowed; agent_id
// presence is enforced in the handler.
export const opportunityCreateBodySchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    agent_id: { type: "integer" },
    submitted_by_id: { type: ["integer", "null"] },
    title: { type: "string" },
    opportunity_type: {
      type: "string",
      enum: ["accompanying", "volunteering"],
    },
    volunteers_number: { type: ["integer", "string"] },
    vo_information: { type: "string" },
    category: { type: "string" },
    category_id: { type: ["integer", "string"] },
    languageIds: { type: "array", items: { type: "integer" } },
    activityIds: { type: "array", items: { type: "integer" } },
    skillIds: { type: "array", items: { type: "integer" } },
    districtIds: { type: "array", items: { type: "integer" } },
    timeslots: { type: ["array", "null"] },
    onetime_date_time: { type: "string" },
    accomp_address: { type: "string" },
    accomp_postcode: { type: "string" },
    accomp_datetime: { type: "string" },
    accomp_name: { type: "string" },
    accomp_phone: { type: "string" },
    accomp_information: { type: "string" },
    accomp_translation: { type: "string" },
    language: { type: "string" },
    last_edited_time_notion: { type: "string" },
  },
};

export const opportunityCreateResponseSchema = {
  201: {
    type: "object",
    required: ["message", "data"],
    properties: {
      message: { type: "string" },
      data: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "integer" } },
      },
    },
  },
  ...responseErrors,
};
