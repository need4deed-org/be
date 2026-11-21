import {
  OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
  OPPORTUNITY_TITLE_MAX_LENGTH,
} from "need4deed-sdk";
import { responseErrors } from "./responseErrors";

export const opportunityLegacyBodySchema = {
  type: "object",
  properties: {
    title: {
      type: ["string", "null"],
      maxLength: OPPORTUNITY_TITLE_MAX_LENGTH,
    },
    vo_information: {
      type: ["string", "null"],
      maxLength: OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
    },
  },
};

export const opportunityCreateBodySchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    agent_id: { type: "integer", minimum: 1 },
    submitted_by_id: { type: ["integer", "null"], minimum: 1 },
    title: { type: "string", maxLength: OPPORTUNITY_TITLE_MAX_LENGTH },
    opportunity_type: {
      type: "string",
      enum: ["accompanying", "volunteering"],
    },
    volunteers_number: { type: ["integer", "string"] },
    vo_information: {
      type: "string",
      maxLength: OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
    },
    category: { type: "string" },
    category_id: { type: ["integer", "string"], minimum: 1 },
    languageIds: { type: "array", items: { type: "integer", minimum: 1 } },
    activityIds: { type: "array", items: { type: "integer", minimum: 1 } },
    skillIds: { type: "array", items: { type: "integer", minimum: 1 } },
    districtIds: { type: "array", items: { type: "integer", minimum: 1 } },
    timeslots: { type: ["array", "null"] },
    onetime_date_time: { type: "string" },
    accomp_address: { type: "string" },
    accomp_postcode: { type: "string" },
    accomp_datetime: { type: "string" },
    accomp_name: { type: "string" },
    accomp_phone: { type: "string" },
    accomp_information: { type: "string" },
    accomp_translation: { type: "string" },
    address: { $ref: "ApiOpportunityAddress#" },
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
        properties: { id: { type: "integer", minimum: 1 } },
      },
    },
  },
  ...responseErrors,
};
